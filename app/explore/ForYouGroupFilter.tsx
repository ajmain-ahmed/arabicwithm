'use client'
import {useState} from 'react'
import {Alert,Box,Button,Checkbox,FormControlLabel,IconButton,Popover,Typography} from '@mui/material'
import {FilterList} from '@mui/icons-material'
import {fetchForYouGroups} from '@/app/actions/forYou'
export default function ForYouGroupFilter({value,onApply}:{value:string[];onApply:(value:string[])=>void}){
 const [anchor,setAnchor]=useState<HTMLElement|null>(null),[rows,setRows]=useState<{id:string;name:string}[]>([]),[draft,setDraft]=useState(value),[error,setError]=useState(''),[loading,setLoading]=useState(false)
 // Only presentation/selection options change; an empty filter still means all eligible content.
 const selectableRows=()=>rows.filter(row=>!window.matchMedia('(max-width:899.95px)').matches||row.name.trim().toLowerCase()!=='imports')
 async function open(target:HTMLElement){setAnchor(target);setDraft(value);setLoading(true);setError('');try{setRows(await fetchForYouGroups())}catch{setError('Unable to load content groups. Please reopen to retry.')}finally{setLoading(false)}}
 return <><IconButton aria-label="Filter content" onClick={e=>void open(e.currentTarget)} sx={{width:40,height:40,color:'#fff'}}><FilterList/></IconButton><Popover open={!!anchor} anchorEl={anchor} onClose={()=>setAnchor(null)} slotProps={{paper:{sx:{p:2,width:280,maxHeight:'70dvh'}}}}><Typography component="h2">Filter content</Typography>{error&&<Alert severity="error">{error}</Alert>}{loading?<Typography>Loading groups…</Typography>:<Box sx={{display:'flex',flexDirection:'column'}}><FormControlLabel label="All groups" control={<Checkbox checked={!draft.length} onChange={()=>setDraft([])}/>}/>{rows.map(row=><FormControlLabel key={row.id} sx={{display:row.name.trim().toLowerCase()==='imports'?{xs:'none',md:'inline-flex'}:undefined}} label={row.name} control={<Checkbox checked={!draft.length||draft.includes(row.id)} onChange={(_,checked)=>{const current=draft.length?draft.filter(id=>id!=='none'):selectableRows().map(r=>r.id);const next=checked?[...current,row.id]:current.filter(id=>id!==row.id);setDraft(next.length?next:['none'])}}/>}/>)}</Box>}<Button disabled={loading||!!error||draft.includes('none')} onClick={()=>{setAnchor(null);const options=selectableRows(),selected=draft.filter(id=>options.some(row=>row.id===id));onApply(selected.length===options.length?[]:selected)}}>Apply</Button></Popover></>
}
