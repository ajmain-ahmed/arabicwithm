'use client'
import { useState } from 'react'
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { RateReviewOutlined } from '@mui/icons-material'
import { useAuth } from '@/app/AuthContext'
import { loadOwnBookReview,saveOwnBookReview,deleteOwnBookReview } from '@/app/actions/bookReviews'
export default function BookReviewButton({bookId}:{bookId:string}) {
 const {user,loading}=useAuth()
 return <OwnReview key={user?.id??'guest'} bookId={bookId} signedIn={Boolean(user)} authLoading={loading}/>
}
function OwnReview({bookId,signedIn,authLoading}:{bookId:string;signedIn:boolean;authLoading:boolean}) {
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[rating,setRating]=useState(5),[text,setText]=useState(''),[saved,setSaved]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 async function show(){
  if(!signedIn){window.dispatchEvent(new CustomEvent('open-auth-dialog',{detail:{mode:'signin'}}));return}
  setBusy(true);setError('');setNotice('')
  try{const review=await loadOwnBookReview(bookId);setRating(review?.rating??5);setText(review?.review_text??'');setSaved(Boolean(review));setOpen(true)}catch(e){setError(e instanceof Error?e.message:'Unable to load review.')}finally{setBusy(false)}
 }
 async function persist(remove=false){
  setBusy(true);setError('');setNotice('')
  try{if(remove){await deleteOwnBookReview(bookId);setText('');setSaved(false);setNotice('Review deleted.')}else{await saveOwnBookReview(bookId,rating,text);setSaved(true);setNotice('Review saved.')}}catch(e){setError(e instanceof Error?e.message:'Unable to save review.')}finally{setBusy(false)}
 }
 return <Box sx={{width:'100%'}}>
  <Button fullWidth variant="outlined" startIcon={<RateReviewOutlined/>} disabled={busy||authLoading} onClick={show} sx={{minHeight:44,px:2.25,borderRadius:'9px',textTransform:'none',fontWeight:700}}>Leave a Review</Button>
  {error&&<Alert severity="error" sx={{mt:1}}>{error}</Alert>}
  {open&&<Paper component="section" aria-label="Your book review" variant="outlined" sx={{p:2,mt:2}}><Stack spacing={2}>
   <Typography component="h2" variant="h6">Your review</Typography>
   <TextField select label="Your rating" value={rating} onChange={e=>setRating(Number(e.target.value))} disabled={busy}>{[1,2,3,4,5].map(value=><MenuItem key={value} value={value}>{value} / 5</MenuItem>)}</TextField>
   <TextField label="Your review" value={text} onChange={e=>setText(e.target.value)} multiline minRows={3} disabled={busy} slotProps={{htmlInput:{maxLength:2000}}}/>
   {notice&&<Alert severity="success">{notice}</Alert>}
   <Stack direction="row" spacing={1} sx={{flexWrap:'wrap'}}><Button variant="contained" disabled={busy} onClick={()=>persist()}>Save review</Button>{saved&&<Button disabled={busy} onClick={()=>persist(true)}>Delete your review</Button>}<Button disabled={busy} onClick={()=>setOpen(false)}>Close</Button></Stack>
  </Stack></Paper>}
 </Box>
}
