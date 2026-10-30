"use client"

import {useEffect,useRef,useState} from 'react'
import {Alert,Box,Button,Dialog,DialogActions,DialogContent,DialogTitle,MenuItem,Paper,Slider,TextField,Typography} from '@mui/material'
import {fetchFeaturedForAdmin,saveFeaturedForAdmin,deleteFeaturedForAdmin} from '@/app/actions/featured'
import {DEFAULT_FEATURED_POSITION,FEATURED_DESKTOP_RATIO,FEATURED_MOBILE_PREVIEW_WIDTH,FEATURED_MOBILE_PREVIEW_HEIGHT,dragFeaturedPosition,featuredObjectPosition,clampPosition,type FeaturedPosition} from '@/app/lib/featuredFraming'
import {errorMessage} from '@/app/lib/errors'

type Data=Awaited<ReturnType<typeof fetchFeaturedForAdmin>>
type Asset=Data['assets'][number]
type Show=Data['shows'][number]

function PositionEditor({shows,assets,asset,onClose,onSaved}:{shows:Show[];assets:Asset[];asset:Asset|null;onClose:()=>void;onSaved:()=>Promise<void>}) {
 const [showId,setShowId]=useState(asset?.show?.id??'')
 const [position,setPosition]=useState<FeaturedPosition>(asset?.position??DEFAULT_FEATURED_POSITION)
 const [file,setFile]=useState<File|null>(null),[localUrl,setLocalUrl]=useState('')
 const [mode,setMode]=useState<'desktop'|'mobile'>('desktop')
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 const active=assets.find(item=>item.show?.id===showId&&item.status==='Featured image')??assets.find(item=>item.show?.id===showId)
 const source=localUrl||(asset?.show?.id===showId?asset.url:active?.url)
 const show=shows.find(show=>show.id===showId)
 const drag=useRef<{x:number;y:number;position:FeaturedPosition;frame:{width:number;height:number};image:{width:number;height:number}}|null>(null)
 useEffect(()=>()=>{if(localUrl)URL.revokeObjectURL(localUrl)},[localUrl])
 const save=async()=>{
  setBusy(true);setError('')
  try{
   const form=new FormData();form.set('showId',showId);form.set('x',String(position.x));form.set('y',String(position.y))
   if(file){form.set('file',file);form.set('replace',String(Boolean(active)))}else form.set('name',asset?.show?.id===showId?asset.name:active?.name??'')
   await saveFeaturedForAdmin(form);await onSaved();onClose()
  }catch(error){setError(errorMessage(error))}finally{setBusy(false)}
 }
 return <Dialog open onClose={()=>{if(!busy)onClose()}} fullWidth maxWidth="lg" slotProps={{paper:{sx:{borderRadius:'14px',m:{xs:1,sm:3},width:{xs:'calc(100% - 16px)',sm:'100%'}}}}}>
  <DialogTitle>{asset?'Edit / Position':'Upload Featured Image'}</DialogTitle>
  <DialogContent>
   <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:2,pt:1,mb:2}}>
    <TextField select label="Show" value={showId} disabled={busy||Boolean(asset)} onChange={event=>{
     const id=event.target.value;setShowId(id);setFile(null);setLocalUrl('');setPosition(assets.find(item=>item.show?.id===id)?.position??DEFAULT_FEATURED_POSITION)
    }}>
     {shows.map(show=><MenuItem key={show.id} value={show.id}>{show.title}{assets.some(asset=>asset.show?.id===show.id)?' - Featured image':' - No featured image'}</MenuItem>)}
    </TextField>
    <Button component="label" variant="outlined" disabled={busy||!showId} sx={{minHeight:48}}>{active?'Replace image':'Choose image'}
     <input hidden type="file" aria-label="Featured image file" accept="image/webp,image/avif,image/jpeg,image/png" onChange={event=>{
      const selected=event.target.files?.[0];if(!selected)return
      if(selected.size>5*1024*1024||!['image/webp','image/avif','image/jpeg','image/png'].includes(selected.type)){setError('Use a WebP, AVIF, JPEG or PNG image up to 5 MB.');return}
      setFile(selected);setLocalUrl(URL.createObjectURL(selected));setPosition(DEFAULT_FEATURED_POSITION);setError('');event.target.value=''
     }}/>
    </Button>
   </Box>
   {file&&<Typography sx={{mb:1,fontSize:13,color:'var(--awm-muted)'}}>{file.name}{active?' - Replaces the current image only when you save.':''}</Typography>}
   <Box role="group" aria-label="Preview device" sx={{display:'flex',gap:1,mb:1.5}}>
    <Button variant={mode==='desktop'?'contained':'outlined'} onClick={()=>setMode('desktop')}>Desktop Preview</Button>
    <Button variant={mode==='mobile'?'contained':'outlined'} onClick={()=>setMode('mobile')}>Mobile Preview</Button>
   </Box>
   <Typography sx={{fontSize:13,color:'var(--awm-muted)',mb:1}}>Drag to frame the artwork. Arrow keys and the sliders adjust the same shared focal position.</Typography>
   {mode==='mobile'&&<Typography sx={{fontSize:12,mb:1}}>390 x 844 viewport - 358 x 472.64 hero</Typography>}
   <Box sx={{overflowX:'auto',pb:1}}>
    <Box role="group" aria-label={`${mode==='desktop'?'Desktop':'Mobile'} positioning preview`} tabIndex={0}
     onKeyDown={event=>{const step=event.shiftKey?5:1;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();setPosition(p=>({x:clampPosition(p.x+(event.key==='ArrowRight'?step:event.key==='ArrowLeft'?-step:0)),y:clampPosition(p.y+(event.key==='ArrowDown'?step:event.key==='ArrowUp'?-step:0))}))}}
     onPointerDown={event=>{const frame=event.currentTarget.getBoundingClientRect(),image=event.currentTarget.querySelector('img');if(!image?.naturalWidth||busy)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drag.current={x:event.clientX,y:event.clientY,position,frame,image:{width:image.naturalWidth,height:image.naturalHeight}}}}
     onPointerMove={event=>{const start=drag.current;if(start)setPosition(dragFeaturedPosition(start.position,event.clientX-start.x,event.clientY-start.y,start.frame,start.image))}}
     onPointerUp={()=>{drag.current=null}} onPointerCancel={()=>{drag.current=null}}
     sx={{position:'relative',width:'100%',maxWidth:mode==='mobile'?FEATURED_MOBILE_PREVIEW_WIDTH:undefined,aspectRatio:mode==='desktop'?FEATURED_DESKTOP_RATIO:`${FEATURED_MOBILE_PREVIEW_WIDTH} / ${FEATURED_MOBILE_PREVIEW_HEIGHT}`,mx:'auto',overflow:'hidden',borderRadius:mode==='desktop'?'18px':'14px',bgcolor:'#0a0f0d',border:'1px solid color-mix(in srgb, var(--awm-bark) 10%, transparent)',cursor:'grab',touchAction:'none',userSelect:'none','&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:2}}}>
     {source?<Box component="img" src={source} alt="Featured artwork preview" draggable={false} sx={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:featuredObjectPosition(position),pointerEvents:'none'}}/>:<Typography sx={{p:3,color:'#fff'}}>Choose a Show and image to preview.</Typography>}
     <Box aria-hidden sx={{position:'absolute',inset:0,pointerEvents:'none',background:'linear-gradient(78deg, rgba(5,9,8,0.85) 0%, rgba(5,9,8,0.5) 36%, transparent 62%)'}}/>
     <Box aria-hidden sx={{position:'absolute',left:0,right:0,bottom:0,height:'52%',pointerEvents:'none',background:'linear-gradient(0deg, rgba(5,9,8,0.78) 0%, rgba(5,9,8,0.35) 40%, transparent 100%)'}}/>
     <Typography aria-hidden sx={{position:'absolute',left:'5%',bottom:'10%',fontFamily:'var(--font-heading)',fontSize:mode==='desktop'?40:32,color:'#fff',pointerEvents:'none'}}>{show?.title}</Typography>
    </Box>
   </Box>
   <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:{xs:1,sm:4},px:1,mt:2}}>
    {(['x','y'] as const).map(axis=><Box key={axis}><Typography id={`featured-${axis}`}>{axis==='x'?'Horizontal':'Vertical'}: {Math.round(position[axis])}%</Typography><Slider aria-labelledby={`featured-${axis}`} disabled={busy} value={position[axis]} min={0} max={100} step={1} onChange={(_,value)=>setPosition(current=>({...current,[axis]:Number(value)}))}/></Box>)}
   </Box>
   {error&&<Alert severity="error">{error}</Alert>}
  </DialogContent>
  <DialogActions sx={{px:3,pb:2,gap:1}}><Button disabled={busy} onClick={()=>setPosition(DEFAULT_FEATURED_POSITION)}>Reset</Button><Box sx={{flex:1}}/><Button disabled={busy} onClick={onClose}>Cancel</Button><Button variant="contained" disabled={busy||!showId||!source} onClick={()=>void save()}>{busy?'Saving...':'Save'}</Button></DialogActions>
 </Dialog>
}

export default function FeaturedManager({initial}:{initial:Data}) {
 const [data,setData]=useState(initial),[editing,setEditing]=useState<Asset|null|undefined>(undefined)
 const [deleting,setDeleting]=useState<Asset|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
 const reload=async()=>{setData(await fetchFeaturedForAdmin());setNotice('Featured settings saved.')}
 const remove=async()=>{if(!deleting)return;setBusy(true);setError('');try{await deleteFeaturedForAdmin(deleting.name);setData(await fetchFeaturedForAdmin());setDeleting(null);setNotice('Featured image removed.')}catch(error){setError(errorMessage(error))}finally{setBusy(false)}}
 return <Box>
  <Box sx={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:2,mb:3}}><Typography component="h1" sx={{fontFamily:'var(--font-heading)',fontSize:32}}>Featured</Typography><Button variant="contained" onClick={()=>{setNotice('');setEditing(null)}}>Upload Featured Image</Button></Box>
  <Typography sx={{mb:2,color:'var(--awm-muted)'}}>Homepage artwork - Shows rotate every three days. Save a shared focal position after checking both previews.</Typography>
  {notice&&<Alert severity="success" sx={{mb:2}}>{notice}</Alert>}{error&&<Alert severity="error" sx={{mb:2}}>{error}</Alert>}
  <Box sx={{display:'grid',gridTemplateColumns:{xs:'minmax(0,1fr)',sm:'repeat(2,minmax(0,1fr))',lg:'repeat(3,minmax(0,1fr))'},gap:2}}>
   {data.assets.map(asset=><Paper component="section" aria-label={asset.name} key={asset.name} variant="outlined" sx={{overflow:'hidden',borderRadius:'12px'}}>
    <Box component="img" src={asset.url} alt={asset.show?.title??asset.name} sx={{display:'block',width:'100%',aspectRatio:FEATURED_DESKTOP_RATIO,objectFit:'cover',objectPosition:featuredObjectPosition(asset.position)}}/>
    <Box sx={{p:2}}><Typography sx={{fontWeight:600}}>{asset.show?.title??asset.name}</Typography><Typography sx={{fontSize:13,color:'var(--awm-muted)'}}>{asset.show?.slug??asset.name.replace(/\.[^.]+$/,'')} - {asset.status}</Typography>
     <Box sx={{display:'flex',flexWrap:'wrap',gap:1,mt:1.5}}><Button disabled={!asset.show} onClick={()=>setEditing(asset)}>Edit / Position</Button><Button disabled={!asset.show} onClick={()=>setEditing(asset)}>Replace</Button><Button color="error" onClick={()=>{setError('');setDeleting(asset)}}>Delete</Button></Box>
    </Box>
   </Paper>)}
  </Box>
  {!data.assets.length&&<Typography>No Featured images yet. Select any Show to upload its artwork.</Typography>}
  {editing!==undefined&&<PositionEditor key={editing?.name??'upload'} shows={data.shows} assets={data.assets} asset={editing} onClose={()=>setEditing(undefined)} onSaved={reload}/>}
  <Dialog open={Boolean(deleting)} onClose={()=>{if(!busy)setDeleting(null)}}><DialogTitle>Remove Featured image for {deleting?.show?.title??deleting?.name}?</DialogTitle><DialogContent>The Featured image and its positioning will be removed. The Show will remain.</DialogContent><DialogActions><Button disabled={busy} onClick={()=>setDeleting(null)}>Cancel</Button><Button color="error" disabled={busy} onClick={()=>void remove()}>Delete Featured image</Button></DialogActions></Dialog>
 </Box>
}
