'use client'
import {useState,type ReactNode} from 'react'
import {Alert,Accordion,AccordionSummary,AccordionDetails,Box,Button,Dialog,DialogActions,DialogContent,DialogTitle,Stack,TextField,Typography} from '@mui/material'
import {manageAdminTranscriptGroup,type TranscriptGroup} from '@/app/actions/transcripts'

export function GroupSelector({groups,value,onChange,disabled=false,label='Group',all=false}:{groups:TranscriptGroup[];value:string;onChange:(value:string)=>void;disabled?:boolean;label?:string;all?:boolean}){
 return <TextField select fullWidth label={label} value={value} onChange={event=>onChange(event.target.value)} disabled={disabled} slotProps={{select:{native:true}}}>
  {all&&<option value="">All groups</option>}<option value={all?'ungrouped':''}>Ungrouped</option>
  {groups.filter(group=>!group.parent_id).flatMap(parent=>[
   <option key={parent.id} value={parent.id}>{parent.name}</option>,
   ...groups.filter(group=>group.parent_id===parent.id).map(child=><option key={child.id} value={child.id}>{parent.name} / {child.name}</option>)
  ])}
 </TextField>
}

export function GroupBrowser({groups,ungrouped,filter,onFilter,results}:{results:ReactNode;groups:TranscriptGroup[];ungrouped:number;filter:string;onFilter:(value:string)=>void}){
 return <Box>{groups.filter(group=>!group.parent_id).map(parent=><Accordion key={parent.id} expanded={filter===parent.id||groups.some(group=>group.parent_id===parent.id&&group.id===filter)} onChange={(_,expanded)=>onFilter(expanded?parent.id:'')}>
  <AccordionSummary expandIcon={<span aria-hidden>⌄</span>}><Typography dir="auto">{parent.name} ({parent.transcript_count})</Typography></AccordionSummary>
  <AccordionDetails><Stack spacing={1}><Button onClick={()=>onFilter(parent.id)}>All in this group ({parent.transcript_count})</Button>{groups.filter(group=>group.parent_id===parent.id).map(child=><Accordion key={child.id} expanded={filter===child.id} onChange={(_,expanded)=>onFilter(expanded?child.id:parent.id)}><AccordionSummary expandIcon={<span aria-hidden>⌄</span>}><Typography dir="auto">{child.name} ({child.transcript_count})</Typography></AccordionSummary><AccordionDetails>{filter===child.id&&results}</AccordionDetails></Accordion>)}{filter===parent.id&&results}</Stack></AccordionDetails>
 </Accordion>)}<Accordion expanded={filter==='ungrouped'} onChange={(_,expanded)=>onFilter(expanded?'ungrouped':'')}><AccordionSummary expandIcon={<span aria-hidden>⌄</span>}>Ungrouped ({ungrouped})</AccordionSummary><AccordionDetails>{filter==='ungrouped'&&results}</AccordionDetails></Accordion></Box>
}

export function GroupManager({open,onClose,groups,onSaved}:{open:boolean;onClose:()=>void;groups:TranscriptGroup[];onSaved:(id:string,created:boolean)=>Promise<void>}){
 const [name,setName]=useState(''),[parent,setParent]=useState(''),[editing,setEditing]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function save(remove=false,id=editing){setBusy(true);setError('');try{
  const result=await manageAdminTranscriptGroup({name:remove?undefined:name,parentId:parent||null,id:id||undefined,remove})
  if(!result.ok){setError(result.error);return}
  await onSaved(result.id,!id&&!remove);setName('');setEditing('');setParent('')
 }catch{setError('Unable to save the group. Please retry.')}finally{setBusy(false)}}
 return <Dialog open={open} onClose={()=>{if(!busy)onClose()}} fullWidth maxWidth="sm"><DialogTitle>Manage transcript groups</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
  {error&&<Alert severity="error">{error}</Alert>}
  <TextField label="Group name" value={name} onChange={event=>setName(event.target.value)} disabled={busy} slotProps={{htmlInput:{maxLength:150}}}/>
  {!editing&&<TextField select label="Parent group" value={parent} onChange={event=>setParent(event.target.value)} disabled={busy} slotProps={{select:{native:true}}}><option value="">Main group</option>{groups.filter(group=>!group.parent_id).map(group=><option key={group.id} value={group.id}>{group.name}</option>)}</TextField>}
  <Stack direction="row" spacing={1}><Button variant="contained" disabled={busy||!name.trim()} onClick={()=>void save()}>{editing?'Save name':'Create group'}</Button>{editing&&<Button disabled={busy} onClick={()=>{setEditing('');setName('');setParent('')}}>New group</Button>}</Stack>
  {groups.map(group=><Stack key={group.id} direction="row" spacing={1} sx={{alignItems:'center',pl:group.parent_id?2:0}}><Typography dir="auto" sx={{flex:1}}>{group.parent_id?`${groups.find(parent=>parent.id===group.parent_id)?.name} / `:''}{group.name} ({group.transcript_count})</Typography><Button disabled={busy} onClick={()=>{setEditing(group.id);setName(group.name);setError('')}}>Rename</Button><Button color="error" disabled={busy||group.transcript_count>0||groups.some(child=>child.parent_id===group.id)} onClick={()=>void save(true,group.id)}>Delete empty group</Button></Stack>)}
  {!groups.length&&<Typography>No groups yet. Create a main group to get started.</Typography>}
 </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Done</Button></DialogActions></Dialog>
}
