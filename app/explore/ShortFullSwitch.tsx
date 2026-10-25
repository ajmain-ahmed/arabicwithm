'use client'
import { ToggleButton, ToggleButtonGroup } from '@mui/material'

export default function ShortFullSwitch({ full, onChange }: { full: boolean; onChange: (full: boolean) => void }) {
  return <ToggleButtonGroup exclusive value={full ? 'full' : 'short'} onChange={(_,value)=>{if(value)onChange(value==='full')}} aria-label="Viewing mode" sx={{
    width:{xs:88,md:112},height:40,flexShrink:0,overflow:'hidden',borderRadius:'999px',border:'1px solid rgba(255,255,255,.24)',bgcolor:'rgba(255,255,255,.08)',
    '&& .MuiToggleButton-root':{width:'50%',minWidth:0,height:'100%',m:0,p:0,border:0,borderRadius:'0 !important',fontSize:{xs:11,md:13},fontWeight:600,color:'#fff',textTransform:'none',lineHeight:1,flex:'1 1 0'},
    '&& .Mui-selected':{bgcolor:'var(--awm-gold)',color:'#fff'},'&& .MuiToggleButton-root:hover':{bgcolor:'rgba(255,255,255,.16)'},'&& .Mui-selected:hover':{bgcolor:'var(--awm-gold)'},
  }}><ToggleButton value="short">Short</ToggleButton><ToggleButton value="full">Full</ToggleButton></ToggleButtonGroup>
}
