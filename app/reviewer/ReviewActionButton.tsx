'use client'
import { Button, CircularProgress, type ButtonProps } from '@mui/material'
export default function ReviewActionButton({loading=false,children,startIcon,disabled,...props}:ButtonProps&{loading?:boolean}){
 return <Button variant="outlined" {...props} disabled={disabled||loading} aria-busy={loading} startIcon={loading?<CircularProgress size={16} color="inherit"/>:startIcon} sx={{minHeight:40,borderRadius:'var(--awm-radius-sm)',px:2,py:1,textTransform:'none',fontFamily:'var(--font-sans)',fontWeight:600,gap:0.5,'& .MuiButton-startIcon>*':{fontSize:18},'&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:2},...props.sx}}>{children}</Button>
}
