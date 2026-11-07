'use client'
import {TextField} from '@mui/material'
import type {SourceLanguage} from '@/app/lib/transcriptSourceLanguage'
export default function TranscriptSourceLanguageField({value,onChange,disabled=false}:{value:SourceLanguage;onChange:(language:SourceLanguage)=>void;disabled?:boolean}){
 return <TextField select fullWidth slotProps={{inputLabel:{shrink:true},input:{notched:true},select:{native:true}}} label="Original Audio Language" value={value} disabled={disabled} onChange={event=>onChange(event.target.value as SourceLanguage)} helperText="Controls transcript display. Does not change group membership or swap JSON fields."><option value="ar">Arabic</option><option value="en">English</option></TextField>
}
