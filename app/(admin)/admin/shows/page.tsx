"use client"

import React, { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
  Collapse,
} from "@mui/material"
import { Edit, Add, ExpandMore } from "@mui/icons-material"
import {
  fetchShowsForAdmin,
  fetchAllEpisodesForAdmin,
  type ShowRow,
  type EpisodeRow,
} from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"
import SearchField from "../components/SearchField"
import ShowEditDialog from "../components/ShowEditDialog"
import EpisodeEditDialog from "../components/EpisodeEditDialog"

type ShowSortKey = keyof ShowRow
type SortDir = "asc" | "desc"

export default function ShowsAdminPage() {
  const [shows, setShows] = useState<ShowRow[]>([])
  const [episodesByShowId, setEpisodesByShowId] = useState<Record<string, EpisodeRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<ShowSortKey>("title")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [expandedShowIds, setExpandedShowIds] = useState<Set<string>>(new Set())

  const [editShowId, setEditShowId] = useState<string | null>(null)
  const [showDialogOpen, setShowDialogOpen] = useState(false)

  const [editEpisodeId, setEditEpisodeId] = useState<string | null>(null)
  const [episodeDialogShowId, setEpisodeDialogShowId] = useState<string>("")
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [showsData, episodesData] = await Promise.all([
        fetchShowsForAdmin(),
        fetchAllEpisodesForAdmin(),
      ])
      setShows(showsData)

      const grouped: Record<string, EpisodeRow[]> = {}
      for (const ep of episodesData) {
        if (!grouped[ep.show_id]) grouped[ep.show_id] = []
        grouped[ep.show_id].push(ep)
      }
      for (const list of Object.values(grouped)) {
        list.sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""))
      }
      setEpisodesByShowId(grouped)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toggleExpand = (showId: string) => {
    setExpandedShowIds((prev) => {
      const next = new Set(prev)
      if (next.has(showId)) {
        next.delete(showId)
      } else {
        next.add(showId)
      }
      return next
    })
  }

  const handleSort = (key: ShowSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const episodeMatchesQuery = (episode: EpisodeRow, q: string) => {
    return (
      episode.title.toLowerCase().includes(q) ||
      episode.slug.toLowerCase().includes(q) ||
      episode.level.toLowerCase().includes(q) ||
      episode.tags.some((t) => t.toLowerCase().includes(q)) ||
      (episode.youtube_id?.toLowerCase().includes(q) ?? false)
    )
  }

  const showMatchesQuery = (show: ShowRow, q: string) => {
    return (
      show.title.toLowerCase().includes(q) ||
      (show.title_ar?.toLowerCase().includes(q) ?? false) ||
      show.slug.toLowerCase().includes(q) ||
      show.level.toLowerCase().includes(q) ||
      (show.category?.toLowerCase().includes(q) ?? false)
    )
  }

  const { filteredShows, autoExpandedShowIds } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...shows].sort((a, b) => {
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

    if (!q) {
      return { filteredShows: sorted, autoExpandedShowIds: new Set<string>() }
    }

    const autoExpanded = new Set<string>()
    const filtered = sorted.filter((show) => {
      if (showMatchesQuery(show, q)) return true
      const episodes = episodesByShowId[show.id] ?? []
      const hasMatchingEpisode = episodes.some((ep) => episodeMatchesQuery(ep, q))
      if (hasMatchingEpisode) {
        autoExpanded.add(show.id)
        return true
      }
      return false
    })

    return { filteredShows: filtered, autoExpandedShowIds: autoExpanded }
  }, [shows, episodesByShowId, query, sortKey, sortDir])

  const effectiveExpandedIds = useMemo(() => {
    return new Set([...expandedShowIds, ...autoExpandedShowIds])
  }, [expandedShowIds, autoExpandedShowIds])

  const totalEpisodes = useMemo(
    () => Object.values(episodesByShowId).reduce((sum, eps) => sum + eps.length, 0),
    [episodesByShowId]
  )

  const openNewShow = () => {
    setEditShowId(null)
    setShowDialogOpen(true)
  }

  const openEditShow = (id: string) => {
    setEditShowId(id)
    setShowDialogOpen(true)
  }

  const openNewEpisode = (showId: string) => {
    setEditEpisodeId(null)
    setEpisodeDialogShowId(showId)
    setEpisodeDialogOpen(true)
  }

  const openEditEpisode = (episodeId: string, showId: string) => {
    setEditEpisodeId(episodeId)
    setEpisodeDialogShowId(showId)
    setEpisodeDialogOpen(true)
  }

  const sortProps = (key: ShowSortKey) => ({
    active: sortKey === key,
    direction: sortDir as "asc" | "desc",
    onClick: () => handleSort(key),
  })

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: "#2c1a0e" }}>
            Shows
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            {shows.length.toLocaleString()} shows · {totalEpisodes.toLocaleString()} episodes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openNewShow}
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
          placeholder="Search shows and episodes..."
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
                <TableCell width={50} />
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
              ) : filteredShows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    No shows match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredShows.map((show) => {
                  const isExpanded = effectiveExpandedIds.has(show.id)
                  const episodes = episodesByShowId[show.id] ?? []
                  const q = query.trim().toLowerCase()
                  const visibleEpisodes = q
                    ? episodes.filter((ep) => episodeMatchesQuery(ep, q))
                    : episodes

                  return (
                    <React.Fragment key={show.id}>
                      <TableRow
                        hover
                        onClick={() => toggleExpand(show.id)}
                        sx={{
                          cursor: "pointer",
                          backgroundColor: isExpanded ? "rgba(184,134,11,0.04)" : "inherit",
                          "& td": { fontFamily: "Jost, sans-serif" },
                        }}
                      >
                        <TableCell width={50}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpand(show.id)
                            }}
                            sx={{ color: "#7a6e65", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}
                          >
                            <ExpandMore sx={{ fontSize: "1.1rem" }} />
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#2c1a0e" }}>{show.title}</TableCell>
                        <TableCell sx={{ direction: "rtl", fontFamily: "'EB Garamond', serif", fontSize: "1.05rem" }}>
                          {show.title_ar}
                        </TableCell>
                        <TableCell sx={{ color: "#7a6e65" }}>{show.slug}</TableCell>
                        <TableCell>{show.level}</TableCell>
                        <TableCell>{show.category}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditShow(show.id)
                            }}
                            sx={{ color: "#b8860b" }}
                          >
                            <Edit sx={{ fontSize: "1.1rem" }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>

                      <TableRow>
                        <TableCell colSpan={7} sx={{ p: 0, borderBottom: "none" }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ px: 2, pb: 2, backgroundColor: "rgba(245,237,224,0.35)" }}>
                              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
                                <Button
                                  size="small"
                                  startIcon={<Add sx={{ fontSize: "1rem" }} />}
                                  onClick={() => openNewEpisode(show.id)}
                                  sx={{
                                    textTransform: "none",
                                    fontFamily: "Jost, sans-serif",
                                    fontWeight: 600,
                                    color: "#2c1a0e",
                                    borderRadius: "8px",
                                    "&:hover": { backgroundColor: "rgba(184,134,11,0.12)" },
                                  }}
                                >
                                  New episode
                                </Button>
                              </Box>

                              <Paper elevation={0} sx={{ borderRadius: "12px", border: "1px solid rgba(122,110,101,0.12)", overflow: "hidden" }}>
                                <TableContainer>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{ backgroundColor: "rgba(44,26,14,0.03)" }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Slug</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Level</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Tags</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>YouTube</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {visibleEpisodes.length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={6} align="center" sx={{ py: 3, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                                            {q ? "No episodes match your search." : "No episodes for this show yet."}
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        visibleEpisodes.map((episode) => (
                                          <TableRow key={episode.id} hover sx={{ "& td": { fontFamily: "Jost, sans-serif" } }}>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                              <Link
                                                href={`/admin/episodes/${episode.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "#2c1a0e", textDecoration: "none" }}
                                              >
                                                {episode.title}
                                              </Link>
                                            </TableCell>
                                            <TableCell sx={{ color: "#7a6e65" }}>{episode.slug}</TableCell>
                                            <TableCell>{episode.level}</TableCell>
                                            <TableCell>{episode.tags.join(", ")}</TableCell>
                                            <TableCell>
                                              {episode.youtube_id ? (
                                                <a
                                                  href={`https://www.youtube.com/watch?v=${episode.youtube_id}`}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  style={{ color: "#b8860b", textDecoration: "none" }}
                                                >
                                                  {episode.youtube_id}
                                                </a>
                                              ) : (
                                                "—"
                                              )}
                                            </TableCell>
                                            <TableCell align="right">
                                              <IconButton
                                                size="small"
                                                onClick={() => openEditEpisode(episode.id, show.id)}
                                                sx={{ color: "#b8860b" }}
                                              >
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
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <ShowEditDialog
        open={showDialogOpen}
        onClose={() => setShowDialogOpen(false)}
        showId={editShowId}
        onSaved={load}
        onDeleted={load}
      />

      <EpisodeEditDialog
        open={episodeDialogOpen}
        onClose={() => setEpisodeDialogOpen(false)}
        episodeId={editEpisodeId}
        showId={episodeDialogShowId || shows[0]?.id || ""}
        shows={shows}
        onSaved={load}
        onDeleted={load}
      />
    </Box>
  )
}
