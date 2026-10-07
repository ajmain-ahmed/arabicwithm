'use client'
import { useEffect, useState } from 'react'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, FormControlLabel, Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { changeManagedAccess, listManagedUsers, managedUserDetails } from '@/app/actions/reviews'
import { ExpandMore, InfoOutlined } from '@mui/icons-material'
import { useVerifiedAccountAccess } from '@/app/AccountAccessContext'
import type { AccessChange, DirectoryResult, DirectoryUser } from '@/app/lib/reviews'

const date = (value: string | null) => value ? new Date(value).toLocaleString('en-GB') : 'Unavailable'
export default function UsersDashboard() {
 const [tab,setTab] = useState<'all'|'premium'|'editor'|'admin'>('all')
 const [search,setSearch] = useState(''), [page,setPage] = useState(0), [revision,setRevision] = useState(0)
 const [result,setResult] = useState<DirectoryResult | null>(null), [error,setError] = useState('')
 const [selected,setSelected] = useState<DirectoryUser | null>(null), [history,setHistory] = useState<(AccessChange & {changed_by_name?:string})[]>([])
 const [editor,setEditor]=useState(false), [admin,setAdmin]=useState(false), [notes,setNotes]=useState('')
 const [manual,setManual]=useState(false), [notice,setNotice]=useState(''), [information,setInformation]=useState(false)
 const [premiumHistory,setPremiumHistory]=useState<{enabled:boolean;reason:string;changed_at:string}[]>([])
 const {refresh:refreshAccess}=useVerifiedAccountAccess()
 const [busy,setBusy] = useState(false), [loadedKey,setLoadedKey] = useState('')
 const key = `${tab}:${search}:${page}:${revision}`
 useEffect(() => {
  let active=true
  const timer=setTimeout(() => { listManagedUsers(tab,search,page).then(data=>{if(active){setResult(data);setLoadedKey(key);setError('')}}).catch(e=>{if(active){setError(e.message);setLoadedKey(key)}}) },250)
  return ()=>{active=false;clearTimeout(timer)}
 },[tab,search,page,revision,key])
 const open = async (user: DirectoryUser) => {
  setBusy(true);setError('')
  try { const details=await managedUserDetails(user.id);setHistory(details.history);setManual(details.manual.enabled);setPremiumHistory(details.manual.history);setNotice('');setSelected(user);setEditor(user.role==='editor');setAdmin(user.role==='admin');setNotes('');setInformation(false) } catch(e){setError(e instanceof Error?e.message:'Unable to load user')} finally{setBusy(false)}
 }
 const save = async () => {
  if(!selected||busy)return
  setBusy(true);setError('');setNotice('')
  try {
   const saved=await changeManagedAccess(selected.id,{premium:manual,editor,admin,notes})
   setSelected({...selected,role:saved.role,premium:saved.premium,manual_premium:saved.manual})
   setManual(saved.manual);setEditor(saved.role==='editor');setAdmin(saved.role==='admin');setNotes('')
   const details=await managedUserDetails(selected.id);setHistory(details.history);setPremiumHistory(details.manual.history)
   setRevision(n=>n+1);await refreshAccess();window.dispatchEvent(new Event('account-access-changed'));setNotice('Access saved.')
  }catch(e){setError(e instanceof Error?e.message:'Unable to save access')}finally{setBusy(false)}
 }
 return <Stack spacing={2}>
  <Typography variant="h4">Users</Typography>
  {error&&<Alert severity="error">{error}</Alert>}
  <Tabs value={tab} variant="scrollable" onChange={(_,v)=>{setTab(v);setPage(0)}}>
   {(['all','premium','editor','admin'] as const).map(t=><Tab key={t} value={t} label={`${{all:'All Users',premium:'Premium',editor:'Editors',admin:'Admins'}[t]} (${result?.counts[t]??'…'})`} />)}
  </Tabs>
  <TextField label="Search by name or email" value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}} slotProps={{htmlInput:{maxLength:200}}} />
  <Typography>{loadedKey!==key?'Loading users…':`${result?.total??0} users`}</Typography>
  {loadedKey===key && result?.users.map(user=><Card key={user.id} variant="outlined"><CardContent>
   <Stack direction="row" spacing={2} sx={{alignItems:"center"}}><Avatar src={user.avatar??undefined}>{user.name[0]}</Avatar><Box sx={{flex:1,minWidth:0}}>
    <Typography sx={{fontWeight:700}}>{user.name}</Typography><Typography sx={{overflowWrap:'anywhere'}}>{user.email}</Typography>
    <Stack direction="row" spacing={1} sx={{my:1}}><Chip label={user.role.toUpperCase()} size="small" />{user.premium&&<Chip label="Premium" size="small" />}</Stack>
   </Box><Button onClick={()=>open(user)} disabled={busy}>View User</Button></Stack>
  </CardContent></Card>)}
  {loadedKey===key&&result?.total===0&&<Typography>No users match this search.</Typography>}
  <Stack direction="row" spacing={2}><Button disabled={page===0||loadedKey!==key} onClick={()=>setPage(p=>p-1)}>Previous</Button><Typography>Page {page+1}</Typography><Button disabled={loadedKey!==key||(page+1)*25>=(result?.total??0)} onClick={()=>setPage(p=>p+1)}>Next</Button></Stack>
  <Dialog open={Boolean(selected)} onClose={()=>!busy&&setSelected(null)} maxWidth="sm" fullWidth>
   <DialogTitle sx={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>{selected?.name}<Tooltip title="Information"><IconButton aria-label="Information" aria-expanded={information} onClick={()=>setInformation(value=>!value)}><InfoOutlined /></IconButton></Tooltip></DialogTitle>
   <DialogContent><Stack spacing={2} sx={{pt:1}}>
    {error&&<Alert severity="error">{error}</Alert>}
    <Typography sx={{overflowWrap:'anywhere'}}>{selected?.email}</Typography>
    {information&&<Box role="region" aria-label="Account information" sx={{p:2,bgcolor:'var(--awm-cream)',borderRadius:'10px'}}>
      <Typography>Joined: {date(selected?.joined??null)}<br />Last sign-in: {date(selected?.last_sign_in??null)}</Typography>
      <Typography>Subscription: {selected?.subscription_status??'None'}{selected?.paid_premium&&<><br />Current period ends: {date(selected.current_period_end)}</>}</Typography>
      <Typography>Review activity: Pending {selected?.activity?.pending??0} | Accepted {selected?.activity?.accepted??0} | Rejected {selected?.activity?.rejected??0}</Typography>
      {selected?.banned_until&&<Typography>Account restricted until {date(selected.banned_until)}</Typography>}
    </Box>}
    <Typography component="h2" variant="h6">Access Level</Typography>
    <Box sx={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))'}}>
      <FormControlLabel control={<Checkbox checked disabled />} label="User" />
      <FormControlLabel control={<Checkbox checked={admin||Boolean(selected?.paid_premium)||manual} disabled={busy||admin||Boolean(selected?.paid_premium)} onChange={event=>setManual(event.target.checked)} />} label="Premium" />
      <FormControlLabel control={<Checkbox checked={admin||editor} disabled={busy||admin} onChange={event=>setEditor(event.target.checked)} />} label="Editor" />
      <FormControlLabel control={<Checkbox checked={admin} disabled={busy} onChange={event=>setAdmin(event.target.checked)} />} label="Admin" />
    </Box>
    {admin&&<Typography variant="caption">Admin includes all site capabilities.</Typography>}
    <TextField label="Notes (optional)" value={notes} onChange={event=>setNotes(event.target.value)} multiline minRows={2} disabled={busy} slotProps={{htmlInput:{maxLength:2000}}} />
    {notice&&<Alert severity="success">{notice}</Alert>}
    <Accordion disableGutters elevation={0}><AccordionSummary expandIcon={<ExpandMore />}>Notes &amp; History</AccordionSummary><AccordionDetails><Stack spacing={2}>
      {!history.length&&!premiumHistory.length&&<Typography>No recorded changes.</Typography>}
      {history.map(item=><Box key={item.id}><Typography variant="body2">{item.previous_role} to {item.new_role} | {date(item.changed_at)}</Typography>{item.reason&&<Typography>{item.reason}</Typography>}</Box>)}
      {premiumHistory.map((item,index)=><Box key={index}><Typography variant="body2">Premium {item.enabled?'enabled':'disabled'} | {date(item.changed_at)}</Typography>{item.reason&&<Typography>{item.reason}</Typography>}</Box>)}
    </Stack></AccordionDetails></Accordion>
   </Stack></DialogContent><DialogActions><Button onClick={()=>setSelected(null)} disabled={busy}>Close</Button><Button onClick={save} variant="contained" disabled={busy}>{busy?'Saving...':'Save access'}</Button></DialogActions>
  </Dialog>
 </Stack>
}
