'use client'

import {Box,Chip} from '@mui/material'
import {AccessTimeRounded,HeadphonesRounded} from '@mui/icons-material'
import CefrChip from '@/app/components/CefrChip'
import {formatReadingTime} from '@/app/lib/readingTime'

/** Keep Chip and its cloned icons on the same side of the RSC boundary. */
export default function BookDetailMetadata({level,readingTimeMinutes,tags,audioChapterCount}:{level?:string;readingTimeMinutes?:number|null;tags:string[];audioChapterCount:number}){
 return (
      <Box sx={{ display: 'flex', gap: 1, mt: 2.5, flexWrap: 'wrap' }}>
        {level && <CefrChip level={level} size="small" />}
        {readingTimeMinutes && (
          <Chip
            icon={<AccessTimeRounded />}
            label={formatReadingTime(readingTimeMinutes)}
            size="small"
            sx={{ bgcolor: 'rgba(14,46,31,0.08)', color: 'var(--awm-forest)', '& .MuiChip-icon': { color: 'inherit' } }}
          />
        )}
        {tags.slice(0, 2).map((tag) => <Chip key={tag} label={tag} size="small" sx={{ bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508' }} />)}
        {audioChapterCount > 0 && <Chip icon={<HeadphonesRounded />} label={`Audiobook · ${audioChapterCount} ${audioChapterCount === 1 ? 'chapter' : 'chapters'}`} size="small" sx={{ bgcolor: 'rgba(184,134,11,0.1)', color: '#8b6508', '& .MuiChip-icon': { color: 'inherit' } }} />}
      </Box>
 )
}
