'use client'

import React, { useState, useMemo } from 'react'
import { Box, Typography } from '@mui/material'
import FilterBar from './components/FilterBar'
import NewsCard, { NewsCardData } from './components/NewsCard'
import ArticleModal from './components/ArticleModal'
import { fetchArticle } from '@/app/actions/news'
import { ArticleFull } from '@/app/lib/news'

interface NewsPageProps {
  articles: NewsCardData[]
  topics: string[]
  sources: string[]
}

export default function NewsPage({ articles, topics, sources }: NewsPageProps) {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [selectedLevels, setSelectedLevels] = useState<string[]>([])
  const [selectedSources, setSelectedSources] = useState<string[]>([])

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedArticle, setSelectedArticle] = useState<ArticleFull | null>(null)
  const [loadingArticle, setLoadingArticle] = useState(false)

  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (selectedTopics.length > 0 && !a.topics.some((t) => selectedTopics.includes(t))) {
        return false
      }
      if (selectedLevels.length > 0 && !selectedLevels.includes(a.cefr)) {
        return false
      }
      if (selectedSources.length > 0 && !selectedSources.includes(a.source)) {
        return false
      }
      return true
    })
  }, [articles, selectedTopics, selectedLevels, selectedSources])

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    )
  }

  const toggleLevel = (level: string) => {
    setSelectedLevels((prev) =>
      prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]
    )
  }

  const toggleSource = (source: string) => {
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    )
  }

  const clearAll = () => {
    setSelectedTopics([])
    setSelectedLevels([])
    setSelectedSources([])
  }

  const openArticle = async (slug: string) => {
    setLoadingArticle(true)
    setModalOpen(true)
    try {
      const article = await fetchArticle(slug)
      setSelectedArticle(article)
    } catch (e) {
      console.error('Failed to load article:', e)
      setSelectedArticle(null)
    } finally {
      setLoadingArticle(false)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    // Delay clearing article to avoid visual flash during close animation
    setTimeout(() => {
      setSelectedArticle(null)
    }, 300)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&family=Jost:wght@300;400;500;600;700&display=swap');
      `}</style>

      <ArticleModal
        article={selectedArticle}
        open={modalOpen}
        onClose={closeModal}
        loading={loadingArticle}
      />

      <Box
        component="main"
        sx={{
          background: '#faf7f2',
          minHeight: '100vh',
          pt: { xs: '80px', md: '96px' },
          pb: { xs: 6, md: 10 },
        }}
      >
        <Box
          sx={{
            maxWidth: 1536,
            mx: 'auto',
            px: { xs: 2, md: 4, lg: 6 },
          }}
        >
          {/* Page Header */}
          <Box sx={{ mb: { xs: 3, md: 4 }, textAlign: 'center' }}>
            <Typography
              sx={{
                fontFamily: '"EB Garamond", serif',
                fontSize: { xs: '2rem', md: '2.8rem' },
                fontWeight: 700,
                color: '#2c1a0e',
                lineHeight: 1.15,
                mb: 1,
              }}
            >
              Arabic News
            </Typography>
            <Box
              sx={{
                width: 60,
                height: '2px',
                background: 'linear-gradient(90deg, transparent, #b8860b, transparent)',
                mx: 'auto',
                mb: 1.5,
              }}
            />
            <Typography
              sx={{
                fontFamily: 'Jost, sans-serif',
                fontSize: { xs: '0.9rem', md: '1rem' },
                color: '#7a6e65',
                maxWidth: 560,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              Read real Arabic news articles with inline vocabulary support.
              Hover over words to see definitions.
            </Typography>
          </Box>

          {/* Filter Bar */}
          <FilterBar
            topics={topics}
            sources={sources}
            selectedTopics={selectedTopics}
            selectedLevels={selectedLevels}
            selectedSources={selectedSources}
            onToggleTopic={toggleTopic}
            onToggleLevel={toggleLevel}
            onToggleSource={toggleSource}
            onClearAll={clearAll}
            totalCount={articles.length}
            filteredCount={filteredArticles.length}
          />

          {/* Articles Grid */}
          {filteredArticles.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography
                sx={{
                  fontFamily: '"EB Garamond", serif',
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  color: '#2c1a0e',
                  mb: 1,
                }}
              >
                No articles match your filters
              </Typography>
              <Typography
                onClick={clearAll}
                sx={{
                  fontFamily: 'Jost, sans-serif',
                  fontSize: '0.9rem',
                  color: '#b8860b',
                  cursor: 'pointer',
                  fontWeight: 500,
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Clear all filters
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  lg: 'repeat(3, 1fr)',
                  xl: 'repeat(4, 1fr)',
                },
                gap: { xs: 2, md: 3 },
              }}
            >
              {filteredArticles.map((article) => (
                <NewsCard
                  key={article.slug}
                  article={article}
                  onClick={() => openArticle(article.slug)}
                />
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </>
  )
}
