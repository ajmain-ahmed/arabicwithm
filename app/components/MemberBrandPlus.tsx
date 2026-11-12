import { Box } from '@mui/material'

/** Inherits the wordmark face and size in both site branding locations. */
export default function MemberBrandPlus() {
  return <Box component="span" aria-hidden="true" data-member-brand-plus sx={{
    display: 'inline-block', flexShrink: 0, color: 'var(--awm-gold-light)',
    WebkitTextFillColor: 'var(--awm-gold-light)', font: 'inherit', lineHeight: 'inherit',
  }}>+</Box>
}
