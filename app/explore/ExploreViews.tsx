'use client'
import {useState} from 'react'
import {Box,Tab,Tabs} from '@mui/material'
import type {ForYouClip} from '@/app/lib/forYou'
import type {ExploreFeedItem} from '@/app/lib/explore'
import ExploreFeed from './ExploreFeed'
import ForYouFeed from './ForYouFeed'

export default function ExploreViews({clips,seed,items,hasMore}:{clips:ForYouClip[];seed:string;items:ExploreFeedItem[];hasMore:boolean}) {
 const [view,setView]=useState(0)
 return <><Box sx={{display:'flex',justifyContent:'center'}}><Tabs value={view} onChange={(_,value:number)=>setView(value)} aria-label="Explore views"><Tab label="For You"/><Tab label="Discover"/></Tabs></Box>
  {view===0?<ForYouFeed initialClips={clips}/>:<ExploreFeed seed={seed} initialItems={items} initialHasMore={hasMore}/>}</>
}
