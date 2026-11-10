'use client'

import { EmailOutlined, Instagram, YouTube } from '@mui/icons-material'
import { Box, Button, Dialog, DialogContent, DialogTitle, Typography } from '@mui/material'

const TikTokIcon = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
)

const contacts = [
  { label: 'TikTok', href: 'https://www.tiktok.com/@arabicwithm', icon: <TikTokIcon /> },
  { label: 'Instagram', href: 'https://www.instagram.com/arabicwithem/', icon: <Instagram /> },
  { label: 'YouTube', href: 'https://www.youtube.com/@arabicwithm', icon: <YouTube /> },
  { label: 'support@arabicwithm.com', href: 'mailto:support@arabicwithm.com', icon: <EmailOutlined /> },
]

export default function ContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: {
      width: { md: 880 }, overflow: 'visible', borderRadius: { xs: '18px', md: '24px' }, bgcolor: '#0e2e1f', border: '1px solid rgba(212,168,67,0.28)',
      backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4a843' fill-opacity='0.08' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E\"), linear-gradient(135deg, #143a27 0%, #0e2e1f 46%, #0a2116 100%)",
      boxShadow: '0 24px 60px rgba(10,33,22,0.35)',
    } } }}>
      <DialogTitle sx={{ px: { xs: 3, sm: 4, md: 5 }, pt: { xs: 3, sm: 4, md: 6 }, pb: 0, color: '#f5ede0 !important', fontFamily: 'var(--font-heading)', fontSize: { xs: 28, sm: 34, md: 40 }, fontWeight: 600 }}>
        Contact Us
      </DialogTitle>
      <DialogContent sx={{ overflow: 'visible', px: { xs: 3, sm: 4, md: 5 }, pr: { md: 5 }, pb: { xs: 3, sm: 4, md: 7 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 270px', md: '380px 398px' }, justifyContent: { md: 'start' }, alignItems: 'center', gap: { xs: 1, sm: 4, md: 1.5 } }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ mt: 1, mb: 2.5, color: 'rgba(245,237,224,0.78) !important', fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 14, md: 16 }, lineHeight: 1.65 }}>
              Questions, feedback or suggestions?<Box component="span" sx={{ display: 'block' }}>We would love to hear from you.</Box>
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1.25 }}>
              {contacts.map(contact => {
                const external = contact.href.startsWith('https://')
                return (
                  <Button
                    key={contact.label}
                    component="a"
                    href={contact.href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    startIcon={contact.icon}
                    variant="outlined"
                    sx={{
                      width: '100%', minHeight: { xs: 48, md: 56 }, minWidth: 0, px: 2, justifyContent: 'flex-start', borderRadius: '10px',
                      borderColor: 'rgba(212,168,67,0.4)', bgcolor: 'rgba(212,168,67,0.08)', color: '#f5ede0',
                      fontFamily: 'var(--font-sans), sans-serif', fontSize: { xs: 13.5, md: 15 }, fontWeight: 600, textTransform: 'none',
                      overflowWrap: 'anywhere', '&:hover': { borderColor: '#d4a843', bgcolor: 'rgba(212,168,67,0.16)' },
                    }}
                  >
                    {contact.label}
                  </Button>
                )
              })}
            </Box>
          </Box>
          <Box sx={{ display: { xs: 'none', sm: 'block' }, position: 'relative', width: '100%', height: '100%', alignSelf: 'stretch' }}>
            <Box component="img" src="/homepage/jiraiya.avif" alt="" sx={{ position: 'absolute', top: 'calc(50% - 16px)', left: { md: 18 }, width: '100%', height: { sm: '115%', md: '130%' }, transform: 'translateY(-50%)', objectFit: 'contain', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.4))' }} />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}
