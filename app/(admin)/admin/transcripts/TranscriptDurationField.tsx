'use client'
import {useState} from 'react'
import {Box,IconButton,Popover,Stack,TextField,ToggleButton,ToggleButtonGroup,Tooltip,Typography} from '@mui/material'
import InfoOutlined from '@mui/icons-material/InfoOutlined'
const help="Enter the video's duration as MM:SS or HH:MM:SS. This is optional when the transcript JSON already contains complete timing information. Minutes mode also accepts MM or HH:MM."
export default function TranscriptDurationField({value,onChange,format,onFormat,disabled,error,required}:{value:string;onChange:(value:string)=>void;format:'clock'|'minutes';onFormat:(format:'clock'|'minutes')=>void;disabled:boolean;error:string;required:boolean}){
 const [clock,setClock]=useState('ms'),[anchor,setAnchor]=useState<HTMLElement|null>(null)
 return <Stack spacing={1} sx={{minWidth:0}}>
  <TextField fullWidth label="Video duration" placeholder={format==='minutes'?'MM or HH:MM':clock==='hms'?'HH:MM:SS':'MM:SS'} value={value} onChange={event=>onChange(event.target.value)} required={required} error={Boolean(error)} helperText={error||undefined} disabled={disabled}/>
  <Stack direction="row" sx={{gap:0.5,alignItems:'flex-start',flexWrap:'wrap'}}>
   <ToggleButtonGroup size="small" exclusive value={format==='minutes'?'minutes':clock} onChange={(_,mode:string|null)=>{if(!mode)return;if(mode==='minutes')onFormat('minutes');else{setClock(mode);onFormat('clock')}}} disabled={disabled} sx={{flex:'1 1 0',minWidth:0,display:{xs:'grid',sm:'inline-flex'},gridTemplateColumns:'1fr 1.2fr','& button':{minWidth:0,fontSize:'0.7rem',textTransform:'none',whiteSpace:'normal',px:0.75},'& button:last-of-type':{gridColumn:'1 / -1'}}}>
    <ToggleButton value="ms">Minutes &amp; Seconds</ToggleButton><ToggleButton value="hms">Hours, Minutes &amp; Seconds</ToggleButton><ToggleButton value="minutes" aria-label="Minutes mode">MM / HH:MM</ToggleButton>
   </ToggleButtonGroup>
   <Tooltip title={help}><IconButton size="small" aria-label="Video duration information" aria-expanded={Boolean(anchor)} onClick={event=>setAnchor(event.currentTarget)}><InfoOutlined fontSize="small"/></IconButton></Tooltip>
  </Stack>
  <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={()=>setAnchor(null)} anchorOrigin={{vertical:'bottom',horizontal:'left'}}><Box sx={{p:2,maxWidth:320}}><Typography variant="body2">{help}</Typography></Box></Popover>
 </Stack>
}
