'use client'

import Link from 'next/link'
import type {ReactNode} from 'react'
import {FEATURED_DESKTOP_RATIO,FEATURED_MOBILE_HEIGHT,featuredObjectPosition,type FeaturedPosition} from '@/app/lib/featuredFraming'
import { Box, Button, Typography } from '@mui/material'
import { FormatListBulleted, PlayArrow } from '@mui/icons-material'
import type { EpisodeMeta, ShowMeta } from '@/app/lib/cartoons'

export interface FeaturedShow {
  show: ShowMeta
  episode?: EpisodeMeta
  featuredImage?: string
  featuredPosition?: FeaturedPosition
  episodeCount: number
}

/* Netflix-style featured banner for every homepage visitor, signed in or
   not: artwork in a card, content bottom-left inside it. Desktop runs
   full-bleed; mobile is a tall card so the whole height of the artwork is
   visible. Deliberately shorter than a streaming billboard so the rows stay
   near the fold. */
export default function FeaturedHero({ show, episode, featuredImage, featuredPosition, priority=true, pagination=false, navigation }: FeaturedShow & {priority?:boolean;pagination?:boolean;navigation?:ReactNode}) {
  return (
    <Box
      data-featured-hero
      sx={{
        pt: '32px',
        pb: { xs: 1.5, md: 2.5 },
        px: { xs: 2, md: 4 },
      }}
    >
      <Box
        sx={{
          position: 'relative',
          /* Desktop: aspect-locked to the artwork (2560×1080) so the whole
             image fits with zero crop. Mobile: a tall card so cover-scaling
             shows the artwork's full height (only the sides crop). */
          height: { xs: FEATURED_MOBILE_HEIGHT, md: 'auto' },
          aspectRatio: { md: FEATURED_DESKTOP_RATIO },
          mx: 'auto',
          borderRadius: { xs: '14px', md: '18px' },
          overflow: 'hidden',
          bgcolor: '#0a0f0d',
          border: '1px solid color-mix(in srgb, var(--awm-bark) 10%, transparent)',
          boxShadow: 'none',
        }}
      >
        <Box
          component="img"
          src={featuredImage ?? "/homepage/dbz-feature.avif"}
          alt={show.title}
          fetchPriority={priority?"high":"low"}
          loading={priority?"eager":"lazy"}
          decoding="async"
          onError={event=>{const image=event.currentTarget;if(!image.dataset.fallback){image.dataset.fallback='true';image.src=show.cover}else image.style.visibility='hidden'}}
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: featuredObjectPosition(featuredPosition) }}
        />
        <Box component={Link} href={`/cartoons/${encodeURIComponent(show.slug)}`} aria-label={`View ${show.title}`} sx={{position:'absolute',inset:0,zIndex:1}} />
        {navigation&&<Box data-featured-mobile-navigation sx={{display:{xs:'block',md:'none'},position:'absolute',top:12,right:12,zIndex:3}}>{navigation}</Box>}
        {/* Legibility: weighted to the left where the text sits. */}
        <Box aria-hidden="true" sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(78deg, rgba(5,9,8,0.85) 0%, rgba(5,9,8,0.5) 36%, transparent 62%)' }} />
        <Box aria-hidden="true" sx={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '52%', background: 'linear-gradient(0deg, rgba(5,9,8,0.78) 0%, rgba(5,9,8,0.35) 40%, transparent 100%)' }} />
        <Box
          sx={{
            position: 'absolute',
            top: { xs: 12, md: 16 },
            left: { xs: 12, md: 16 },
            zIndex: 2,
            px: 1.4,
            py: 0.45,
            borderRadius: '9999px',
            bgcolor: 'rgba(5,9,8,0.55)',
            border: '1px solid rgba(255,255,255,0.14)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Typography sx={{ color: 'var(--awm-gold-light)', fontFamily: 'var(--font-sans), sans-serif', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1 }}>
            Featured
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: { xs: 'center', md: 'flex-start' },
            justifyContent: 'flex-end',
            textAlign: { xs: 'center', md: 'left' },
            px: { xs: 2.5, sm: 4, md: 6 },
            pointerEvents:'none', '& a':{pointerEvents:'auto'},
            pb: { xs: 2.25, md: 3.5 },
          }}
        >
          {show.slug.toLowerCase()==='dbz'?<Box component="img" src="/homepage/dbz-logo.png" alt={show.title} sx={{width:{xs:250,md:500},height:'auto',display:'block',filter:'drop-shadow(0 3px 10px rgba(0,0,0,.55))'}}/>:<Typography component="h2" sx={{color:'#fff',fontFamily:'var(--font-heading)',fontWeight:700,fontSize:{xs:44,md:76},lineHeight:1.05,textShadow:'0 3px 10px rgba(0,0,0,.55)'}}>{show.title}</Typography>}
          <Box data-featured-actions sx={{ display:{xs:'flex',md:pagination?'grid':'flex'},gridTemplateColumns:'minmax(0,1fr) auto minmax(0,1fr)',gridTemplateRows:{xs:'auto auto',md:'auto'}, alignItems: 'center',justifyContent:{xs:'flex-start',md:'normal'}, gap: {xs:1.25,md:1.25}, width: { xs: '100%', md: pagination?'100%':'auto' }, mt: { xs: 2, md: 2.75 } }}>
           <Box sx={{display:'flex',gridColumn:1,gridRow:1,gap:1.25,width:{xs:'auto',md:'100%'}}} >
            <Button
              component={Link}
              href={episode?`/cartoons/${encodeURIComponent(show.slug)}/${encodeURIComponent(episode.slug)}`:`/cartoons/${encodeURIComponent(show.slug)}`}
              variant="contained"
              startIcon={<PlayArrow sx={{ fontSize: { xs: pagination?18:22, md: 26 } }} />}
              sx={{
                flex: { xs: '0 1 auto', md: '0 0 auto' },
                gridColumn:1,gridRow:1,minWidth:0,
                minHeight: { xs: 50, md: 58 },
                px: { xs: 1.5, md: 4 },
                borderRadius: '9999px',
                bgcolor: '#0e2e1f',
                color: '#fff',
                fontFamily: 'var(--font-sans), sans-serif',
                fontWeight: 800,
                fontSize: { xs: 15, md: 17 },
                textTransform: 'none',
                boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
                '&:hover': { bgcolor: '#174832', boxShadow: '0 6px 18px rgba(0,0,0,0.35)' },
              }}
            >
              Play
            </Button>
            <Button
              component={Link}
              href={`/cartoons/${encodeURIComponent(show.slug)}`}
              startIcon={<FormatListBulleted sx={{ fontSize: { xs: pagination?18:19, md: 22 } }} />}
              sx={{
                flex: { xs: '0 1 auto', md: '0 0 auto' },
                gridColumn:{xs:1,md:3},gridRow:{xs:2,md:1},minWidth:0,
                minHeight: { xs: 50, md: 58 },
                px: { xs: 1.5, md: 3.5 },
                borderRadius: '9999px',
                bgcolor: 'rgba(109,109,110,0.55)',
                color: '#fff',
                fontFamily: 'var(--font-sans), sans-serif',
                fontWeight: 700,
                fontSize: { xs: 15, md: 17 },
                textTransform: 'none',
                backdropFilter: 'blur(6px)',
                '&:hover': { bgcolor: 'rgba(109,109,110,0.4)' },
              }}
            >
              Episodes
            </Button>
           </Box>
           {navigation&&<Box sx={{display:{xs:'none',md:'block'},gridColumn:2,gridRow:1,justifySelf:'center'}}>{navigation}</Box>}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
