"use client"

import React from "react"
import { Dialog, DialogContent, IconButton } from "@mui/material"
import { Close } from "@mui/icons-material"
import { type ShowMeta } from "@/app/lib/cartoons"
import ShowEditor from "./ShowEditor"

interface ShowEditDialogProps {
  open: boolean
  show?: ShowMeta
  onClose: () => void
  onSaved: () => void
}

export default function ShowEditDialog({ open, show, onClose, onSaved }: ShowEditDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 24px 64px rgba(44,26,14,0.2)",
          },
        },
      }}
    >
      <IconButton
        onClick={onClose}
        size="small"
        sx={{ position: "absolute", top: 12, right: 12, color: "#7a6e65", zIndex: 1 }}
      >
        <Close sx={{ fontSize: "1.2rem" }} />
      </IconButton>
      <DialogContent sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
        <ShowEditor
          show={show}
          onSaved={() => { onSaved(); onClose(); }}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
