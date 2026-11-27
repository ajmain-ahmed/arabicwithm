'use client'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'

import {UiText} from '@/app/components/WebsiteLocaleProvider'
import LocalisedContent from '@/app/components/LocalisedContent'

import {useState} from 'react'
import {Alert,Box,Button,Checkbox,FormControlLabel,IconButton,Popover,Typography} from '@mui/material'
import {FilterList} from '@mui/icons-material'
import {fetchForYouGroups} from '@/app/actions/forYou'
import {cleanExploreGroups,isEnglishExploreGroup} from '@/app/lib/exploreGroupFilters'
import {boundedRead} from '@/app/lib/readRecovery'
export default function ForYouGroupFilter({value,onApply}:{value:string[];onApply:(value:string[])=>void}){
 const {t:awmT}=useWebsiteLocale()

 const [anchor,setAnchor]=useState<HTMLElement|null>(null),[rows,setRows]=useState<{id:string;name:string;nameAr?:string}[]>([]),[draft,setDraft]=useState(value),[error,setError]=useState(''),[loading,setLoading]=useState(false)
 // Only presentation/selection options change; an empty filter still means all eligible content.
 const selectableRows=()=>rows.filter(row=>row.name.trim().toLowerCase()!=='imports'&&!isEnglishExploreGroup(row))
 async function open(target:HTMLElement){setAnchor(target);setDraft(value);setLoading(true);setError('');try{const loaded=await boundedRead(fetchForYouGroups());setRows(loaded);const cleaned=cleanExploreGroups(value,loaded);setDraft(cleaned);if(cleaned.length!==value.length)onApply(cleaned)}catch{setError('Unable to load content groups. Please reopen to retry.')}finally{setLoading(false)}}
 return <><IconButton aria-label={awmT("Filter content")} onClick={e=>void open(e.currentTarget)} sx={{width:40,height:40,color:'#fff'}}><FilterList/></IconButton><Popover open={!!anchor} anchorEl={anchor} onClose={()=>setAnchor(null)} slotProps={{paper:{sx:{p:2,width:280,maxHeight:'70dvh'}}}}><Typography component="h2"><UiText>{"Filter content"}</UiText></Typography>{error&&<Alert severity="error"><UiText>{error}</UiText></Alert>}{loading?<Typography><UiText>{"Loading groups…"}</UiText></Typography>:<Box sx={{display:'flex',flexDirection:'column'}}><FormControlLabel label={awmT("All groups")} control={<Checkbox checked={!draft.length} onChange={()=>setDraft([])}/>}/>{selectableRows().map(row=><FormControlLabel key={row.id} label={<LocalisedContent original={awmT(row.name)} arabic={row.nameAr}/>} control={<Checkbox checked={!draft.length||draft.includes(row.id)} onChange={(_,checked)=>{const current=draft.length?draft.filter(id=>id!=='none'):selectableRows().map(r=>r.id);const next=checked?[...current,row.id]:current.filter(id=>id!==row.id);setDraft(next.length?next:['none'])}}/>}/>)}</Box>}<Button disabled={loading||!!error||draft.includes('none')} onClick={()=>{setAnchor(null);const options=selectableRows(),selected=draft.filter(id=>options.some(row=>row.id===id));onApply(selected.length===options.length?[]:selected)}}><UiText>{"Apply"}</UiText></Button></Popover></>
}
