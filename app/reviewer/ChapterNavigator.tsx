'use client'
import { useState } from 'react'
import { Box, Button, MenuItem, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { reviewUnitLabel, type ReviewCatalogueItem } from '@/app/lib/reviewLabels'

export default function ChapterNavigator({units,value,onChange,disabled=false,label='Chapter',emptyLabel='Choose…'}:{units:ReviewCatalogueItem[];value:string;onChange:(id:string)=>void;disabled?:boolean;label?:string;emptyLabel?:string}){
 const [view,setView]=useState<'dropdown'|'scroll'>('dropdown')
 return <Stack spacing={1}>
  <ToggleButtonGroup size="small" exclusive value={view} onChange={(_,next)=>{if(next)setView(next)}} aria-label={`${label} view`} disabled={disabled}><ToggleButton value="dropdown">Dropdown View</ToggleButton><ToggleButton value="scroll">Scroll View</ToggleButton></ToggleButtonGroup>
  {view==='dropdown'?<TextField disabled={disabled} select label={label} value={value} onChange={e=>onChange(e.target.value)}><MenuItem value="">{emptyLabel}</MenuItem>{units.map(unit=><MenuItem key={unit.id} value={unit.id}>{reviewUnitLabel(unit)}</MenuItem>)}</TextField>:<Box role="group" aria-label={`${label} list`} sx={{maxHeight:320,overflowY:'auto',border:'1px solid color-mix(in srgb, var(--awm-gold) 25%, transparent)',borderRadius:'var(--awm-radius-sm)',p:1}}><Stack spacing={0.5}>
   <Button disabled={disabled} onClick={()=>onChange('')} aria-pressed={!value} sx={{justifyContent:'flex-start',textTransform:'none'}}>{emptyLabel}</Button>
   {units.map(unit=><Button key={unit.id} disabled={disabled} onClick={()=>onChange(unit.id)} aria-pressed={value===unit.id} variant={value===unit.id?'outlined':'text'} sx={{justifyContent:'flex-start',textAlign:'left',textTransform:'none'}}>{reviewUnitLabel(unit)}</Button>)}
   {!units.length&&<Typography variant="body2">No {label.toLowerCase()}s are available.</Typography>}
  </Stack></Box>}
 </Stack>
}
