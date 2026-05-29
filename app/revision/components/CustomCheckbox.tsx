'use client'

import React from 'react'
import { Box } from '@mui/material'
import { Check } from 'lucide-react'

interface CustomCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  onClick: () => void
}

function CustomCheckbox({
  checked,
  indeterminate = false,
  onClick,
}: CustomCheckboxProps) {
  return (
    <Box
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      sx={{
        width: 18,
        height: 18,
        borderRadius: '4px',
        border: '2px solid',
        borderColor: checked || indeterminate ? '#b8860b' : 'rgba(44,26,14,0.25)',
        background: checked || indeterminate ? '#b8860b' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s ease',
      }}
    >
      {checked && (
        <Check size={12} strokeWidth={3} color="#fff" />
      )}
      {indeterminate && !checked && (
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '2px',
            background: '#b8860b',
          }}
        />
      )}
    </Box>
  )
}

export default React.memo(CustomCheckbox)
