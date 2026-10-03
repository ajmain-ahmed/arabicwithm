"use client";
import Link from "next/link";
import { Button } from "@mui/material";
export default function TranscriptSearchLink() {
  return (
    <Button component={Link} href="/explore/search">
      Search transcripts
    </Button>
  );
}
