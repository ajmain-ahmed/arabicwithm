'use client'
import { useEffect, useState } from 'react'
import { Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { changeManagedPremium, changeManagedRole, listManagedUsers, managedUserDetails } from '@/app/actions/reviews'
import type { AccessChange, AccountRole, DirectoryResult, DirectoryUser } from '@/app/lib/reviews'

const date = (value: string | null) => value ? new Date(value).toLocaleString('en-GB') : 'Unavailable'
export default function UsersDashboard() {
 const [tab,setTab] = useState<'all'|'premium'|'editor'|'admin'>('all')
 const [search,setSearch] = useState(''), [page,setPage] = useState(0), [revision,setRevision] = useState(0)
 const [result,setResult] = useState<DirectoryResult | null>(null), [error,setError] = useState('')
 const [selected,setSelected] = useState<DirectoryUser | null>(null), [history,setHistory] = useState<(AccessChange & {changed_by_name?:string})[]>([])
 const [role,setRole] = useState<AccountRole>('user'), [reason,setReason] = useState(''), [confirmation,setConfirmation] = useState('')
 const [manual,setManual]=useState(false), [premiumReason,setPremiumReason]=useState(''), [notice,setNotice]=useState('')
 const [busy,setBusy] = useState(false), [loadedKey,setLoadedKey] = useState('')
 const key = `${tab}:${search}:${page}:${revision}`
 useEffect(() => {
  let active=true
  const timer=setTimeout(() => { listManagedUsers(tab,search,page).then(data=>{if(active){setResult(data);setLoadedKey(key);setError('')}}).catch(e=>{if(active){setError(e.message);setLoadedKey(key)}}) },250)
  return ()=>{active=false;clearTimeout(timer)}
 },[tab,search,page,revision,key])
 const open = async (user: DirectoryUser) => {
  setBusy(true);setError('')
  try { const details=await managedUserDetails(user.id);setHistory(details.history);setManual(details.manual.enabled);setPremiumReason('');setNotice('');setSelected(user);setRole(user.role);setReason('');setConfirmation('') } catch(e){setError(e instanceof Error?e.message:'Unable to load user')} finally{setBusy(false)}
 }
 const save = async () => {
  if(!selected)return
  setBusy(true);setError('')
  try { await changeManagedRole(selected.id,role,reason,confirmation);setSelected(null);setRevision(n=>n+1) } catch(e){setError(e instanceof Error?e.message:'Unable to change access')} finally{setBusy(false)}
 }
 const savePremium=async()=>{
  if(!selected)return
  setBusy(true);setError('');setNotice('')
  try{
   const effective=await changeManagedPremium(selected.id,!manual,premiumReason)
   setManual(!manual);setSelected({...selected,manual_premium:!manual,premium:effective});setRevision(n=>n+1)
   setNotice('Premium access saved. Paid subscription access is unchanged.');setPremiumReason('')
  }catch(e){setError(e instanceof Error?e.message:'Unable to save Premium access')}finally{setBusy(false)}
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
    <Stack direction="row" spacing={1} sx={{my:1}}><Chip label={user.role.toUpperCase()} size="small" />{user.premium&&<Chip label={user.paid_premium?'Premium subscription':'Premium · Admin included'} size="small" />}</Stack>
    <Typography variant="caption">Joined: {date(user.joined)}</Typography>
    {user.role==='editor'&&<Typography variant="body2">Pending: {user.activity?.pending??0} · Accepted: {user.activity?.accepted??0} · Rejected: {user.activity?.rejected??0}</Typography>}
   </Box><Button onClick={()=>open(user)} disabled={busy}>View User</Button></Stack>
  </CardContent></Card>)}
  {loadedKey===key&&result?.total===0&&<Typography>No users match this search.</Typography>}
  <Stack direction="row" spacing={2}><Button disabled={page===0||loadedKey!==key} onClick={()=>setPage(p=>p-1)}>Previous</Button><Typography>Page {page+1}</Typography><Button disabled={loadedKey!==key||(page+1)*25>=(result?.total??0)} onClick={()=>setPage(p=>p+1)}>Next</Button></Stack>
  <Dialog open={Boolean(selected)} onClose={()=>!busy&&setSelected(null)} maxWidth="sm" fullWidth>
   <DialogTitle>{selected?.name}</DialogTitle><DialogContent><Stack spacing={2} sx={{pt:1}}>
    {error&&<Alert severity="error">{error}</Alert>}
    <Typography sx={{overflowWrap:'anywhere'}}>{selected?.email}<br />ID: {selected?.id}</Typography>
    <Typography>Joined: {date(selected?.joined??null)}<br />Last sign-in: {date(selected?.last_sign_in??null)}</Typography>
    <Typography>Role: {selected?.role}<br />Access: {selected?.premium?'Premium':'Free'}<br />Subscription: {selected?.subscription_status??'None'}{selected?.paid_premium&&<><br />{selected.cancel_at_period_end?'Expires':'Current period ends'}: {date(selected.current_period_end)}</>}</Typography>
    {selected?.banned_until&&new Date(selected.banned_until)>new Date()&&<Alert severity="warning">Account restricted until {date(selected.banned_until)}</Alert>}
    <Typography>Review activity: Pending {selected?.activity?.pending??0} · Accepted {selected?.activity?.accepted??0} · Rejected {selected?.activity?.rejected??0} · Withdrawn {selected?.activity?.withdrawn??0}</Typography>
    <Typography variant="h6">Manual Premium access</Typography>
    <Chip label={manual?'Enabled':'Disabled'} />
    <Typography variant="body2">Manual access supplements paid subscriptions. Revoking it does not cancel billing or remove active paid access.</Typography>
    <TextField label="Reason for Premium change" value={premiumReason} onChange={e=>setPremiumReason(e.target.value)} />
    <Button variant="outlined" disabled={busy||!premiumReason.trim()} onClick={savePremium}>{manual?'Revoke manual Premium':'Grant Premium'}</Button>
    {notice&&<Alert severity="success">{notice}</Alert>}
    <Typography variant="h6">Manage Access</Typography>
    <TextField select label="Role" value={role} onChange={e=>setRole(e.target.value as AccountRole)}>{(['user','editor','admin'] as const).map(r=><MenuItem value={r} key={r}>{r}</MenuItem>)}</TextField>
    {role!==selected?.role&&<Alert severity={role==='admin'||selected?.role==='admin'?'warning':'info'}>{role==='admin'?`Give Admin access to ${selected?.name}? Admin access grants control of users and canonical content.`:role==='editor'?`Give Editor access to ${selected?.name}? Editors can review and propose corrections, but cannot modify or delete canonical content.`:`Remove privileged access from ${selected?.name}? They will return to User access. Existing suggestions and history remain.`}</Alert>}
    <TextField label="Reason for access change" value={reason} onChange={e=>setReason(e.target.value)} multiline />
    <TextField label="Confirm by entering this account ID" value={confirmation} onChange={e=>setConfirmation(e.target.value)} />
    <Typography variant="h6">Access History</Typography>
    {history.length===0&&<Typography>No recorded role changes.</Typography>}
    {history.map(item=><Box key={item.id}><Typography>{item.previous_role} → {item.new_role} · {date(item.changed_at)}</Typography><Typography variant="caption" sx={{overflowWrap:'anywhere'}}>Changed by: {item.changed_by_name??item.changed_by}<br />{item.reason}</Typography></Box>)}
   </Stack></DialogContent><DialogActions><Button onClick={()=>setSelected(null)} disabled={busy}>Close</Button><Button onClick={save} disabled={busy||role===selected?.role||!reason.trim()||confirmation!==selected?.id}>Confirm role change</Button></DialogActions>
  </Dialog>
 </Stack>
}

