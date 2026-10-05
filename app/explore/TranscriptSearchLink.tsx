"use client";
import Link from "next/link";
import { Button } from "@mui/material";
export default function TranscriptSearchLink() {
  return (
    <Button component={Link} href="/explore/search" sx={{ minHeight: 44, px: 1.5, borderRadius: '9999px', bgcolor: 'var(--awm-cream-light)', color: 'var(--awm-bark)', '&:hover': { bgcolor: 'var(--awm-cream)' } }}>
      Search transcripts
    </Button>
  );
}
