"use client"

import React, { useEffect, useState } from "react"
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Collapse,
} from "@mui/material"
import { ExpandMore, ExpandLess } from "@mui/icons-material"
import { fetchVocabDuplicates, type DuplicateGroup } from "@/app/actions/admin"
import VocabEditDialog from "../components/VocabEditDialog"

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "Something went wrong"
}

function GroupSection({
  title,
  groups,
  onWordClick,
  defaultExpanded = true,
}: {
  title: string
  groups: DuplicateGroup[]
  onWordClick: (id: number) => void
  defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  if (groups.length === 0) return null

  return (
    <Box sx={{ mb: 4 }}>
      <Button
        onClick={() => setExpanded((e) => !e)}
        endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
        sx={{
          justifyContent: "space-between",
          width: "100%",
          textTransform: "none",
          color: "#2c1a0e",
          px: 0,
          py: 1,
          mb: 1,
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontFamily: "'EB Garamond', serif",
            fontWeight: 700,
            fontSize: "1.5rem",
          }}
        >
          {title}
        </Typography>
      </Button>
      <Collapse in={expanded}>
        {groups.map((group, idx) => (
          <Paper
            key={idx}
            variant="outlined"
            sx={{ p: 2, mb: 2, borderRadius: "12px", bgcolor: "#fafafa" }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
              <Typography
                sx={{
                  fontFamily: "Jost, sans-serif",
                  fontWeight: 700,
                  color: "#7a6e65",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontSize: "0.8rem",
                }}
              >
                {group.key}
              </Typography>
              <Chip label={`${group.words.length} words`} size="small" sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.75rem" }} />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {group.words.map((word) => (
                <Box
                  key={word.word_id}
                  sx={{
                    display: "flex",
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                      <Typography
                        sx={{
                          fontFamily: "'EB Garamond', serif",
                          fontSize: "1.1rem",
                          color: "#2c1a0e",
                          direction: "rtl",
                        }}
                      >
                        {word.word_di || word.word_ar}
                      </Typography>
                      <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontStyle: "italic" }}>
                        {word.word_tr}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", fontSize: "0.85rem" }}>
                      {word.gloss}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      {word.level && <Chip label={word.level} size="small" sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.7rem", bgcolor: "rgba(184,134,11,0.12)", color: "#2c1a0e" }} />}
                      {word.theme && <Chip label={word.theme} size="small" sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.7rem", bgcolor: "rgba(14,46,31,0.08)", color: "#2c1a0e" }} />}
                      {word.source && <Chip label={word.source} size="small" sx={{ fontFamily: "Jost, sans-serif", fontSize: "0.7rem", bgcolor: "rgba(44,26,14,0.06)", color: "#7a6e65" }} />}
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    onClick={() => onWordClick(word.word_id)}
                    sx={{
                      textTransform: "none",
                      fontFamily: "Jost, sans-serif",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      color: "#2c1a0e",
                      borderRadius: "8px",
                      border: "1px solid rgba(122,110,101,0.25)",
                      px: 1.5,
                      flexShrink: 0,
                    }}
                  >
                    Edit {word.word_id}
                  </Button>
                </Box>
              ))}
            </Box>
          </Paper>
        ))}
      </Collapse>
    </Box>
  )
}

export default function DuplicatesAdminPage() {
  const [data, setData] = useState<{
    exactAr: DuplicateGroup[]
    exactDi: DuplicateGroup[]
    byGloss: DuplicateGroup[]
    byRoot: DuplicateGroup[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editId, setEditId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchVocabDuplicates()
      setData(result)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load duplicates")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const openEdit = (id: number) => {
    setEditId(id)
    setDialogOpen(true)
  }

  const totalGroups =
    (data?.exactDi.length ?? 0) +
    (data?.byGloss.length ?? 0) +
    (data?.byRoot.length ?? 0)

  return (
    <Box>
      <Typography variant="h4" sx={{ fontFamily: "'EB Garamond', serif", fontWeight: 700, color: "#2c1a0e", mb: 1 }}>
        Duplicates
      </Typography>
      <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65", mb: 3 }}>
        {loading
          ? "Scanning vocabulary for duplicates…"
          : `${totalGroups} duplicate group${totalGroups === 1 ? "" : "s"} found`}
      </Typography>

      {error && (
        <Typography sx={{ color: "#c0392b", mb: 2, fontFamily: "Jost, sans-serif" }}>{error}</Typography>
      )}

      {loading ? null : data ? (
        <>
          <GroupSection title={`Exact duplicate diacritized Arabic — ${data.exactDi.reduce((n, g) => n + g.words.length, 0)} duplicates`} groups={data.exactDi} onWordClick={openEdit} />
          <GroupSection title={`Potential duplicates by meaning — ${data.byGloss.reduce((n, g) => n + g.words.length, 0)} duplicates`} groups={data.byGloss} onWordClick={openEdit} />
          <GroupSection title={`Potential duplicates by root — ${data.byRoot.reduce((n, g) => n + g.words.length, 0)} duplicates`} groups={data.byRoot} onWordClick={openEdit} />
          {totalGroups === 0 && (
            <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
              No duplicate groups found.
            </Typography>
          )}
        </>
      ) : null}

      <VocabEditDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        wordId={editId}
        onSaved={load}
        onDeleted={load}
      />
    </Box>
  )
}
