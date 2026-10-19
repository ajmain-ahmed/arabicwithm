'use client'
import {useRef,useState,type ReactNode} from 'react'
import {Alert,Accordion,AccordionSummary,AccordionDetails,Box,Button,Dialog,DialogActions,DialogContent,DialogTitle,Stack,TextField,Typography} from '@mui/material'
import {manageAdminTranscriptGroup,type TranscriptGroup} from '@/app/actions/transcripts'

export function GroupSelector({groups,value,onChange,disabled=false,label='Group (optional)',all=false}:{groups:TranscriptGroup[];value:string;onChange:(value:string)=>void;disabled?:boolean;label?:string;all?:boolean}){
 return <TextField select fullWidth label={label} value={value} onChange={event=>onChange(event.target.value)} disabled={disabled} slotProps={{inputLabel:{shrink:true},input:{notched:true},select:{native:true}}} sx={{minWidth:0,'& select':{textOverflow:'ellipsis',overflow:'hidden',whiteSpace:'nowrap'}}}>
  {all&&<option value="">All groups</option>}<option value={all?'ungrouped':''}>Ungrouped</option>
  {groups.map(group=><option key={group.id} value={group.id}>{group.name}</option>)}
 </TextField>
}

export function GroupBrowser({groups,ungrouped,filter,onFilter,results,onAdd,onEdit}:{results:ReactNode;groups:TranscriptGroup[];ungrouped:number;filter:string;onFilter:(value:string)=>void;onAdd:(id:string|null)=>void;onEdit:(group:TranscriptGroup)=>void}){
 const [collapsed,setCollapsed]=useState<string|null>(null)
 return <Box>{[{id:'ungrouped',name:'Ungrouped',transcript_count:ungrouped},...groups].map(group=><Accordion key={group.id} expanded={filter===group.id&&collapsed!==group.id} onChange={(_,expanded)=>{setCollapsed(expanded?null:group.id);if(expanded)onFilter(group.id)}}>
  <AccordionSummary expandIcon={<span aria-hidden>⌄</span>}><Typography dir="auto" sx={{minWidth:0,overflowWrap:'anywhere'}}>{group.name} <Typography component="span" color="text.secondary">({group.transcript_count})</Typography></Typography></AccordionSummary>
  <AccordionDetails><Stack spacing={2}>{filter===group.id&&results}<Stack direction={{xs:'column',sm:'row'}} spacing={1} sx={{alignSelf:{xs:'stretch',sm:'flex-start'}}}><Button variant="outlined" onClick={()=>onAdd(group.id==='ungrouped'?null:group.id)}>Add Transcript</Button>{group.id!=='ungrouped'&&group.id!=='drafts'&&<Button variant="outlined" onClick={()=>{const selected=groups.find(item=>item.id===group.id);if(selected)onEdit(selected)}}>Edit Group</Button>}</Stack></Stack></AccordionDetails>
 </Accordion>)}</Box>
}

export function GroupEditDialog({group,onClose,onSaved}:{group:TranscriptGroup;onClose:()=>void;onSaved:()=>Promise<void>}){
 const [name,setName]=useState(group.name),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const saving=useRef(false)
 async function save(){
  if(saving.current||!name.trim())return
  saving.current=true;setBusy(true);setError('')
  try{
   const result=await manageAdminTranscriptGroup({id:group.id,name:name.trim()})
   if(!result.ok){setError(result.error);return}
   try{await onSaved()}catch{setError('Group renamed, but the list could not refresh. Please refresh the page.');return}
   onClose()
  }catch{setError('Could not rename group. Please try again.')}
  finally{saving.current=false;setBusy(false)}
 }
 return <Dialog open onClose={()=>{if(!saving.current)onClose()}} fullWidth maxWidth="sm" aria-labelledby="edit-transcript-group-title">
  <DialogTitle id="edit-transcript-group-title">Edit Group</DialogTitle>
  <DialogContent><Stack spacing={2} sx={{pt:1}}>{error&&<Alert severity="error">{error}</Alert>}<TextField autoFocus fullWidth label="Group name" value={name} disabled={busy} onChange={event=>setName(event.target.value)} slotProps={{htmlInput:{maxLength:150,dir:'auto'}}}/></Stack></DialogContent>
  <DialogActions sx={{flexWrap:'wrap'}}><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy||!name.trim()} onClick={()=>void save()}>{busy?'Saving…':'Save Changes'}</Button></DialogActions>
 </Dialog>
}

export function GroupManager({open,onClose,groups,onSaved}:{open:boolean;onClose:()=>void;groups:TranscriptGroup[];onSaved:(id:string,created:boolean)=>Promise<void>}){
 const [name,setName]=useState(''),[editing,setEditing]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function save(remove=false,id=editing){setBusy(true);setError('');try{
  const result=await manageAdminTranscriptGroup({name:remove?undefined:name,parentId:null,id:id||undefined,remove})
  if(!result.ok){setError(result.error);return}
  await onSaved(result.id,!id&&!remove);setName('');setEditing('')
 }catch{setError('Unable to save the group. Please retry.')}finally{setBusy(false)}}
 return <Dialog open={open} onClose={()=>{if(!busy)onClose()}} fullWidth maxWidth="sm"><DialogTitle>Manage transcript groups</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
  {error&&<Alert severity="error">{error}</Alert>}
  <TextField label="Group name" value={name} onChange={event=>setName(event.target.value)} disabled={busy} slotProps={{htmlInput:{maxLength:150}}}/>
  <Stack direction="row" spacing={1}><Button variant="contained" disabled={busy||!name.trim()} onClick={()=>void save()}>{editing?'Save name':'Create group'}</Button>{editing&&<Button disabled={busy} onClick={()=>{setEditing('');setName('')}}>New group</Button>}</Stack>
  {groups.map(group=><Stack key={group.id} direction="row" spacing={1} sx={{alignItems:'center',minWidth:0}}><Typography dir="auto" sx={{flex:1}}>{group.name} ({group.transcript_count})</Typography><Button disabled={busy} onClick={()=>{setEditing(group.id);setName(group.name);setError('')}}>Rename</Button><Button color="error" disabled={busy||group.transcript_count>0||groups.some(child=>child.parent_id===group.id)} onClick={()=>void save(true,group.id)}>Delete empty group</Button></Stack>)}
  {!groups.length&&<Typography>No groups yet. Create a group to get started.</Typography>}
 </Stack></DialogContent><DialogActions><Button disabled={busy} onClick={onClose}>Done</Button></DialogActions></Dialog>
}
