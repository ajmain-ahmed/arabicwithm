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
  fetchBooksForAdmin,
  fetchChaptersForBookAdmin,
  type BookRow,
  type ChapterRow,
} from "@/app/actions/admin"
import { errorMessage } from "@/app/lib/errors"
import SearchField from "../components/SearchField"
import BookEditDialog from "../components/BookEditDialog"
import ChapterEditDialog from "../components/ChapterEditDialog"

type BookSortKey = keyof BookRow
type SortDir = "asc" | "desc"

async function fetchAllChapters(): Promise<ChapterRow[]> {
  const all: ChapterRow[] = []
  const booksData = await fetchBooksForAdmin()
  for (const book of booksData) {
    const chapters = await fetchChaptersForBookAdmin(book.id)
    all.push(...chapters)
  }
  return all
}

export default function BooksAdminPage() {
  const [books, setBooks] = useState<BookRow[]>([])
  const [chaptersByBookId, setChaptersByBookId] = useState<Record<string, ChapterRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")
  const [sortKey, setSortKey] = useState<BookSortKey>("title")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [expandedBookIds, setExpandedBookIds] = useState<Set<string>>(new Set())

  const [editBookId, setEditBookId] = useState<string | null>(null)
  const [bookDialogOpen, setBookDialogOpen] = useState(false)

  const [editChapterId, setEditChapterId] = useState<string | null>(null)
  const [chapterDialogBookId, setChapterDialogBookId] = useState<string>("")
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [booksData, chaptersData] = await Promise.all([
        fetchBooksForAdmin(),
        fetchAllChapters(),
      ])
      setBooks(booksData)

      const grouped: Record<string, ChapterRow[]> = {}
      for (const ch of chaptersData) {
        if (!grouped[ch.book_id]) grouped[ch.book_id] = []
        grouped[ch.book_id].push(ch)
      }
      for (const list of Object.values(grouped)) {
        list.sort((a, b) => a.chapter_number - b.chapter_number)
      }
      setChaptersByBookId(grouped)
    } catch (e: unknown) {
      setError(errorMessage(e) ?? "Failed to load content")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const toggleExpand = (bookId: string) => {
    setExpandedBookIds((prev) => {
      const next = new Set(prev)
      if (next.has(bookId)) {
        next.delete(bookId)
      } else {
        next.add(bookId)
      }
      return next
    })
  }

  const handleSort = (key: BookSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("asc")
    }
  }

  const chapterMatchesQuery = (chapter: ChapterRow, q: string) => {
    return (
      chapter.title.toLowerCase().includes(q) ||
      chapter.slug.toLowerCase().includes(q) ||
      String(chapter.chapter_number).includes(q)
    )
  }

  const bookMatchesQuery = (book: BookRow, q: string) => {
    return (
      book.title.toLowerCase().includes(q) ||
      (book.title_ar?.toLowerCase().includes(q) ?? false) ||
      book.slug.toLowerCase().includes(q) ||
      book.level.toLowerCase().includes(q) ||
      (book.category?.toLowerCase().includes(q) ?? false)
    )
  }

  const { filteredBooks, autoExpandedBookIds } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = [...books].sort((a, b) => {
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
      return { filteredBooks: sorted, autoExpandedBookIds: new Set<string>() }
    }

    const autoExpanded = new Set<string>()
    const filtered = sorted.filter((book) => {
      if (bookMatchesQuery(book, q)) return true
      const chapters = chaptersByBookId[book.id] ?? []
      const hasMatchingChapter = chapters.some((ch) => chapterMatchesQuery(ch, q))
      if (hasMatchingChapter) {
        autoExpanded.add(book.id)
        return true
      }
      return false
    })

    return { filteredBooks: filtered, autoExpandedBookIds: autoExpanded }
  }, [books, chaptersByBookId, query, sortKey, sortDir])

  const effectiveExpandedIds = useMemo(() => {
    return new Set([...expandedBookIds, ...autoExpandedBookIds])
  }, [expandedBookIds, autoExpandedBookIds])

  const totalChapters = useMemo(
    () => Object.values(chaptersByBookId).reduce((sum, chs) => sum + chs.length, 0),
    [chaptersByBookId]
  )

  const openNewBook = () => {
    setEditBookId(null)
    setBookDialogOpen(true)
  }

  const openEditBook = (id: string) => {
    setEditBookId(id)
    setBookDialogOpen(true)
  }

  const openNewChapter = (bookId: string) => {
    setEditChapterId(null)
    setChapterDialogBookId(bookId)
    setChapterDialogOpen(true)
  }

  const openEditChapter = (chapterId: string, bookId: string) => {
    setEditChapterId(chapterId)
    setChapterDialogBookId(bookId)
    setChapterDialogOpen(true)
  }

  const sortProps = (key: BookSortKey) => ({
    active: sortKey === key,
    direction: sortDir as "asc" | "desc",
    onClick: () => handleSort(key),
  })

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: "#2c1a0e" }}>
            Books
          </Typography>
          <Typography sx={{ fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
            {books.length.toLocaleString()} books · {totalChapters.toLocaleString()} chapters
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openNewBook}
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
          New book
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search books and chapters..."
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
                    Loading books…
                  </TableCell>
                </TableRow>
              ) : filteredBooks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                    No books match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredBooks.map((book) => {
                  const isExpanded = effectiveExpandedIds.has(book.id)
                  const chapters = chaptersByBookId[book.id] ?? []
                  const q = query.trim().toLowerCase()
                  const visibleChapters = q
                    ? chapters.filter((ch) => chapterMatchesQuery(ch, q))
                    : chapters

                  return (
                    <React.Fragment key={book.id}>
                      <TableRow
                        hover
                        onClick={() => toggleExpand(book.id)}
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
                              toggleExpand(book.id)
                            }}
                            sx={{ color: "#7a6e65", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}
                          >
                            <ExpandMore sx={{ fontSize: "1.1rem" }} />
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, color: "#2c1a0e" }}>{book.title}</TableCell>
                        <TableCell sx={{ direction: "rtl", fontFamily: "'EB Garamond', serif", fontSize: "1.05rem" }}>
                          {book.title_ar}
                        </TableCell>
                        <TableCell sx={{ color: "#7a6e65" }}>{book.slug}</TableCell>
                        <TableCell>{book.level}</TableCell>
                        <TableCell>{book.category}</TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditBook(book.id)
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
                                  onClick={() => openNewChapter(book.id)}
                                  sx={{
                                    textTransform: "none",
                                    fontFamily: "Jost, sans-serif",
                                    fontWeight: 600,
                                    color: "#2c1a0e",
                                    borderRadius: "8px",
                                    "&:hover": { backgroundColor: "rgba(184,134,11,0.12)" },
                                  }}
                                >
                                  New chapter
                                </Button>
                              </Box>

                              <Paper elevation={0} sx={{ borderRadius: "12px", border: "1px solid rgba(122,110,101,0.12)", overflow: "hidden" }}>
                                <TableContainer>
                                  <Table size="small">
                                    <TableHead>
                                      <TableRow sx={{ backgroundColor: "rgba(44,26,14,0.03)" }}>
                                        <TableCell sx={{ fontWeight: 600 }}>Chapter #</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Slug</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 600 }}>Actions</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {visibleChapters.length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={4} align="center" sx={{ py: 3, fontFamily: "Jost, sans-serif", color: "#7a6e65" }}>
                                            {q ? "No chapters match your search." : "No chapters for this book yet."}
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        visibleChapters.map((chapter) => (
                                          <TableRow key={chapter.id} hover sx={{ "& td": { fontFamily: "Jost, sans-serif" } }}>
                                            <TableCell>{chapter.chapter_number}</TableCell>
                                            <TableCell sx={{ fontWeight: 600 }}>
                                              <Link
                                                href={`/admin/books/${chapter.id}`}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ color: "#2c1a0e", textDecoration: "none" }}
                                              >
                                                {chapter.title}
                                              </Link>
                                            </TableCell>
                                            <TableCell sx={{ color: "#7a6e65" }}>{chapter.slug}</TableCell>
                                            <TableCell align="right">
                                              <IconButton
                                                size="small"
                                                onClick={() => openEditChapter(chapter.id, book.id)}
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

      <BookEditDialog
        open={bookDialogOpen}
        onClose={() => setBookDialogOpen(false)}
        bookId={editBookId}
        onSaved={load}
        onDeleted={load}
      />

      <ChapterEditDialog
        open={chapterDialogOpen}
        onClose={() => setChapterDialogOpen(false)}
        chapterId={editChapterId}
        bookId={chapterDialogBookId || books[0]?.id || ""}
        books={books}
        onSaved={load}
        onDeleted={load}
      />
    </Box>
  )
}
