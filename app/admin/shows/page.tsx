"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  IconButton,
} from "@mui/material"
import { Edit, Add } from "@mui/icons-material"
import { fetchShowsForAdmin, type ShowRow } from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"
import SearchField from "../components/SearchField"
import ShowEditDialog from "../components/ShowEditDialog"


type SortKey = keyof ShowRow
type SortDir = "asc" | "desc"

export default function ShowsAdminPage() {
  const [rows, setRows] = useState<ShowRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("order")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [editId, setEditId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchShowsForAdmin()
      setRows(data)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load shows")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (q
      ? rows.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.title_ar?.toLowerCase().includes(q) ?? false) ||
            r.slug.toLowerCase().includes(q) ||
            r.level.toLowerCase().includes(q) ||
            (r.category?.toLowerCase().includes(q) ?? false) ||
            (r.genre?.toLowerCase().includes(q) ?? false)
        )
      : [...rows]
    ).sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null || bVal == null) return 0
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal
      }
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()
      if (aStr < bStr) return sortDir === "asc" ? -1 : 1
      if (aStr > bStr) return sortDir === "asc" ? 1 : -1
      return 0
    })

    return list
  }, [rows, query, sortKey, sortDir])

  const openNew = () => {
    setEditId(null)
    setDialogOpen(true)
  }

  const openEdit = (id: string) => {
    setEditId(id)
    setDialogOpen(true)
  }

  const sortProps = (key: SortKey) => ({
    active: sortKey === key,
    direction: sortDir as "asc" | "desc",
    onClick: () => handleSort(key),
  })

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}>
            Shows
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            {rows.length.toLocaleString()} shows in the database
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openNew}
          sx={{
            bgcolor: "#2c1a0e",
            color: "#f5ede0",
            textTransform: "none",
            fontFamily: "Jost, sans-serif",
            fontWeight: 600,
            borderRadius: "10px",
            "&:hover": { bgcolor: "#1a0f08" },
          }}
        >
          New show
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search title, slug, level, category, or genre..."
        />
      </Box>

      {error && (
        <Typography sx={{ color: "#c0392b", mb: 2, fontFamily: "Jost, sans-serif" }}>{error}</Typography>
      )}

      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: "calc(100vh - 260px)" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel {...sortProps("order")}>Order</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("title")}>Title</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("title_ar")}>Title AR</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("slug")}>Slug</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("level")}>Level</TableSortLabel>
                </TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    Loading shows…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    No shows match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id} hover sx={{ "& td": { fontFamily: "Jost, sans-serif" } }}>
                    <TableCell>{row.order}</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#2c1a0e" }}>{row.title}</TableCell>
                    <TableCell sx={{ direction: "rtl", fontFamily: "'EB Garamond', serif", fontSize: "1.05rem" }}>
                      {row.title_ar}
                    </TableCell>
                    <TableCell sx={{ color: "#7a6e65" }}>{row.slug}</TableCell>
                    <TableCell>{row.level}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => openEdit(row.id)} sx={{ color: "#b8860b" }}>
                        <Edit sx={{ fontSize: "1.1rem" }} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ShowEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        showId={editId}
        onSaved={load}
        onDeleted={load}
      />
    </Box>
  )
}
