'use client'
import Link from 'next/link'
import {Box,Button,Typography} from '@mui/material'
import {AccountTreeOutlined,GridOnRounded,PsychologyOutlined} from '@mui/icons-material'
import {useWebsiteLocale} from '@/app/components/WebsiteLocaleProvider'
const destinations=[
 {label:'Grammar',href:'/grammar',Icon:AccountTreeOutlined},
 {label:'Word Search',href:'/word-search',Icon:GridOnRounded},
 {label:'Memory',href:'/memory',Icon:PsychologyOutlined},
]
export default function LearnNavigationTiles(){

 const {t,direction}=useWebsiteLocale()
 return <Box component="nav" data-learn-navigation aria-label={t("Learning areas")} dir={direction} sx={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:{xs:1,sm:1.25},mt:2,width:'100%'}}>
  {destinations.map(({label,href,Icon})=><Button key={href} component={Link} href={href} sx={{aspectRatio:'1',minWidth:0,minHeight:80,p:{xs:1,sm:1.25},display:'flex',flexDirection:'column',justifyContent:'center',gap:1,textTransform:'none',borderRadius:'10px',color:'var(--awm-bark)',bgcolor:'var(--awm-white)',border:'1px solid color-mix(in srgb,var(--awm-gold) 30%,transparent)',transition:'background-color .15s,border-color .15s,transform .15s','&:hover':{bgcolor:'color-mix(in srgb,var(--awm-gold) 10%,var(--awm-white))',borderColor:'var(--awm-gold)'},'&:focus-visible':{outline:'2px solid var(--awm-gold)',outlineOffset:3},'&:active':{transform:'translateY(1px)'}}}>
   <Icon aria-hidden="true" sx={{fontSize:26,color:'var(--awm-gold)',flexShrink:0}}/>
   <Typography component="span" sx={{fontFamily:'var(--font-sans)',fontSize:14,fontWeight:600,lineHeight:1.5,textAlign:'center',whiteSpace:'normal',overflowWrap:'anywhere'}}>{t(label)}</Typography>
  </Button>)}
 </Box>
}
