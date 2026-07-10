'use client'

import {
    ArrowForwardIos,
    ExpandMore,
    InventoryOutlined,
    LocalShippingOutlined,
    MailOutlineOutlined,
    ShoppingBagOutlined,
} from '@mui/icons-material'
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material'
import { SectionLabel, SectionTitle } from './SectionTitle'

const SUPPORT_CARDS = [
    {
        icon: <MailOutlineOutlined sx={{ fontSize: 22 }} />,
        title: 'Email Us',
        body: 'For account questions, feedback, or anything else.',
        action: 'hello@yourapp.com',
        href: 'mailto:hello@yourapp.com',
    },
    {
        icon: <LocalShippingOutlined sx={{ fontSize: 22 }} />,
        title: 'Learning Guide',
        body: 'Tips on how to get the most out of your daily practice.',
        action: 'Learn more',
        href: '#',
    },
    {
        icon: <InventoryOutlined sx={{ fontSize: 22 }} />,
        title: 'Bug Reports',
        body: "Something not working? We'll get it fixed.",
        action: 'Contact us',
        href: 'mailto:hello@yourapp.com?subject=Bug Report',
    },
    {
        icon: <ShoppingBagOutlined sx={{ fontSize: 22 }} />,
        title: 'Data & Privacy',
        body: 'Questions about your data? Read our policy or email us.',
        action: 'Read policy',
        href: '#',
    },
]

const FAQS = [
    {
        q: 'How is content organised?',
        a: 'Vocabulary is grouped by CEFR level (A0–C2) and real-world themes such as food, travel, and work.',
    },
    {
        q: 'Is my data secure?',
        a: 'Absolutely. Your data is stored securely and never shared with third parties.',
    },
]

export default function SupportSection() {
    return (
        <Box>
            <SectionLabel>Help</SectionLabel>
            <SectionTitle>Support</SectionTitle>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 4 }}>
                {SUPPORT_CARDS.map((item) => (
                    <Box
                        key={item.title}
                        component="a"
                        href={item.href}
                        sx={{
                            background: 'var(--awm-white)',
                            border: '1px solid color-mix(in srgb, var(--awm-gold) 18%, transparent)',
                            borderRadius: 'var(--awm-radius-xs)',
                            p: 2.5,
                            transition: 'box-shadow 0.2s',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            display: 'block',
                            '&:hover': {
                                boxShadow: '0 8px 32px color-mix(in srgb, var(--awm-bark) 8%, transparent)',
                            },
                        }}
                    >
                        <Box sx={{ color: 'var(--awm-gold)', mb: 1.5 }}>{item.icon}</Box>
                        <Typography
                            sx={{
                                fontFamily: 'var(--font-serif)',
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                color: 'var(--awm-bark)',
                                mb: 0.5,
                            }}
                        >
                            {item.title}
                        </Typography>
                        <Typography
                            sx={{
                                fontFamily: 'var(--font-sans)',
                                fontSize: '0.82rem',
                                color: 'var(--awm-muted)',
                                lineHeight: 1.6,
                                mb: 1.5,
                            }}
                        >
                            {item.body}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                                sx={{
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--awm-gold)',
                                    letterSpacing: '0.04em',
                                }}
                            >
                                {item.action}
                            </Typography>
                            <ArrowForwardIos sx={{ fontSize: 10, color: 'var(--awm-gold)' }} />
                        </Box>
                    </Box>
                ))}
            </Box>

            <Box
                sx={{
                    background: 'var(--awm-white)',
                    border: '1px solid color-mix(in srgb, var(--awm-gold) 18%, transparent)',
                    borderRadius: 'var(--awm-radius-xs)',
                    overflow: 'hidden',
                }}
            >
                <Box sx={{ p: { xs: 2, sm: 3 }, pb: { xs: 1, sm: 1 } }}>
                    <Typography
                        sx={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '1.3rem',
                            fontWeight: 600,
                            color: 'var(--awm-bark)',
                            mb: 1.5,
                        }}
                    >
                        Common Questions
                    </Typography>
                </Box>

                {FAQS.map(({ q, a }) => (
                    <Accordion
                        key={q}
                        disableGutters
                        elevation={0}
                        sx={{
                            background: 'transparent',
                            borderTop: '1px solid color-mix(in srgb, var(--awm-bark) 7%, transparent)',
                            '&:last-of-type': { borderBottom: '1px solid color-mix(in srgb, var(--awm-bark) 7%, transparent)' },
                            '&::before': { display: 'none' },
                        }}
                    >
                        <AccordionSummary
                            expandIcon={<ExpandMore sx={{ fontSize: 20, color: 'var(--awm-muted)' }} />}
                            sx={{
                                px: { xs: 2, sm: 3 },
                                py: 0.5,
                                '& .MuiAccordionSummary-content': {
                                    my: 1.2,
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '0.88rem',
                                    fontWeight: 500,
                                    color: 'var(--awm-bark)',
                                },
                            }}
                        >
                            {q}
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: { xs: 2, sm: 3 }, pb: 2.5, pt: 0 }}>
                            <Typography
                                sx={{
                                    fontFamily: 'var(--font-sans)',
                                    fontSize: '0.82rem',
                                    color: 'var(--awm-muted)',
                                    lineHeight: 1.7,
                                }}
                            >
                                {a}
                            </Typography>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Box>
        </Box>
    )
}
