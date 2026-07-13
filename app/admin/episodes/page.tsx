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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material"
import { Edit, Add } from "@mui/icons-material"
import {
  fetchShowsForAdmin,
  fetchEpisodesForShowAdmin,
  fetchAllEpisodesForAdmin,
  type ShowRow,
  type EpisodeRow,
} from "@/app/actions/admin"
import SearchField from "../components/SearchField"
import EpisodeEditDialog from "../components/EpisodeEditDialog"
import { errorMessage } from "@/app/lib/errors"

type SortKey = keyof EpisodeRow | "show_title"
type SortDir = "asc" | "desc"

const ALL_SHOWS = "__all__"

export default function EpisodesAdminPage() {
  const [shows, setShows] = useState<ShowRow[]>([])
  const [selectedShowId, setSelectedShowId] = useState<string>(ALL_SHOWS)
  const [rows, setRows] = useState<EpisodeRow[]>([])
  const [loadingShows, setLoadingShows] = useState(true)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [editId, setEditId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    setLoadingShows(true)
    fetchShowsForAdmin()
      .then((data) => {
        setShows(data)
      })
      .catch((e: unknown) => setError(errorMessage(e) ?? "Failed to load shows"))
      .finally(() => setLoadingShows(false))
  }, [])

  const loadEpisodes = async (showId: string) => {
    setLoadingEpisodes(true)
    setError(null)
    try {
      const data =
        showId === ALL_SHOWS
          ? await fetchAllEpisodesForAdmin()
          : await fetchEpisodesForShowAdmin(showId)
      setRows(data)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load episodes")
    } finally {
      setLoadingEpisodes(false)
    }
  }

  useEffect(() => {
    loadEpisodes(selectedShowId)
  }, [selectedShowId])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const showMap = useMemo(() => {
    const map = new Map<string, ShowRow>()
    for (const s of shows) map.set(s.id, s)
    return map
  }, [shows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = (q
      ? rows.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.slug.toLowerCase().includes(q) ||
            r.level.toLowerCase().includes(q) ||
            r.tags.some((t) => t.toLowerCase().includes(q)) ||
            (r.youtube_id?.toLowerCase().includes(q) ?? false) ||
            showMap.get(r.show_id)?.title.toLowerCase().includes(q)
        )
      : [...rows]
    ).sort((a, b) => {
      if (sortKey === "show_title") {
        const aTitle = showMap.get(a.show_id)?.title ?? ""
        const bTitle = showMap.get(b.show_id)?.title ?? ""
        return sortDir === "asc" ? aTitle.localeCompare(bTitle) : bTitle.localeCompare(aTitle)
      }
      const aVal = a[sortKey as keyof EpisodeRow]
      const bVal = b[sortKey as keyof EpisodeRow]
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
  }, [rows, query, sortKey, sortDir, showMap])

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

  const isAllShows = selectedShowId === ALL_SHOWS
  const selectedShow = shows.find((s) => s.id === selectedShowId)

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e" }}>
            Episodes
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} episodes
            {isAllShows ? " across all shows" : ` in ${selectedShow?.title ?? "selected show"}`}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openNew}
          disabled={isAllShows}
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
          New episode
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <FormControl
          size="small"
          sx={{
            minWidth: 220,
            "& .MuiInputBase-root": { fontFamily: "Jost, sans-serif", fontSize: "0.9rem", borderRadius: "8px" },
            "& .MuiInputLabel-root": { fontFamily: "Jost, sans-serif", fontSize: "0.85rem" },
          }}
        >
          <InputLabel id="show-select-label" shrink>Show</InputLabel>
          <Select
            labelId="show-select-label"
            value={selectedShowId}
            label="Show"
            onChange={(e) => setSelectedShowId(e.target.value)}
          >
            <MenuItem value={ALL_SHOWS}>All shows</MenuItem>
            {shows.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.title}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search title, slug, level, tags, or YouTube ID..."
          />
        </Box>
      </Box>

      {error && (
        <Typography sx={{ color: "#c0392b", mb: 2, fontFamily: "Jost, sans-serif" }}>{error}</Typography>
      )}

      <Paper elevation={0} sx={{ borderRadius: "16px", border: "1px solid rgba(122,110,101,0.15)", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: "calc(100vh - 300px)" }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {isAllShows && (
                  <TableCell>
                    <TableSortLabel {...sortProps("show_title")}>Show</TableSortLabel>
                  </TableCell>
                )}

                <TableCell>
                  <TableSortLabel {...sortProps("title")}>Title</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("slug")}>Slug</TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel {...sortProps("level")}>Level</TableSortLabel>
                </TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>YouTube</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingShows || loadingEpisodes ? (
                <TableRow>
                  <TableCell colSpan={isAllShows ? 7 : 6} align="center" sx={{ py: 4, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    Loading episodes…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isAllShows ? 7 : 6} align="center" sx={{ py: 4, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    No episodes found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow key={row.id} hover sx={{ "& td": { fontFamily: "Jost, sans-serif" } }}>
                    {isAllShows && (
                      <TableCell>{showMap.get(row.show_id)?.title ?? row.show_id}</TableCell>
                    )}

                    <TableCell sx={{ fontWeight: 600, color: "#2c1a0e" }}>{row.title}</TableCell>
                    <TableCell sx={{ color: "#7a6e65" }}>{row.slug}</TableCell>
                    <TableCell>{row.level}</TableCell>
                    <TableCell>{row.tags.join(", ")}</TableCell>
                    <TableCell>
                      {row.youtube_id ? (
                        <a
                          href={`https://www.youtube.com/watch?v=${row.youtube_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#b8860b", textDecoration: "none" }}
                        >
                          {row.youtube_id}
                        </a>
                      ) : (
                        "—"
                      )}
                    </TableCell>
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

      <EpisodeEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        episodeId={editId}
        showId={isAllShows ? (shows[0]?.id ?? "") : selectedShowId}
        shows={shows}
        onSaved={() => loadEpisodes(selectedShowId)}
        onDeleted={() => loadEpisodes(selectedShowId)}
      />
    </Box>
  )
}
