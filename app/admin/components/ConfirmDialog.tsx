"use client"

import React from "react"
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
} from "@mui/material"

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontFamily: "'EB Garamond', serif",
          fontWeight: 700,
          color: "#2c1a0e",
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent>
        <DialogContentText
          sx={{
            fontFamily: "Jost, sans-serif",
            color: "#7a6e65",
            fontSize: "0.95rem",
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onCancel}
          sx={{
            fontFamily: "Jost, sans-serif",
            textTransform: "none",
            color: "#7a6e65",
          }}
        >
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          sx={{
            fontFamily: "Jost, sans-serif",
            textTransform: "none",
            bgcolor: "#c0392b",
            "&:hover": { bgcolor: "#a93226" },
          }}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
