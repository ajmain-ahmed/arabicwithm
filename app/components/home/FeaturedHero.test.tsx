import {act} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import FeaturedHero from './FeaturedHero'
for(const slug of ['arc','bb','mov','cotp','dbz','hxh','misc'])it(`keeps the ${slug} artwork, image link, and episode links on the same show`,()=>{
 const host=document.createElement('div')
 host.innerHTML=renderToStaticMarkup(<FeaturedHero show={{id:slug,slug,title:slug.toUpperCase(),cover:'/cover.webp',level:'B1',episodeCount:1}} featuredImage={`https://storage.test/featured/${slug}.jpg`} episode={{id:'episode',slug:`${slug}-1`,title:'Scene',level:'B1',tags:[]}} episodeCount={1}/>)
 expect(host.querySelector(`a[aria-label="View ${slug.toUpperCase()}"]`)?.getAttribute('href')).toBe('/cartoons/'+slug)
 expect(host.querySelector('img')?.getAttribute('src')).toBe(`https://storage.test/featured/${slug}.jpg`)
 for(const link of host.querySelectorAll('a'))expect(link.getAttribute('href')).toMatch(new RegExp('^/cartoons/'+slug+'(?:/|$)'))
})

it('renders saved focal coordinates on the actual Homepage image',async()=>{
 const host=document.createElement('div');document.body.appendChild(host);const root=createRoot(host)
 await act(async()=>root.render(<FeaturedHero show={{id:'arc',slug:'arc',title:'Arcane',cover:'/cover',level:'B1',episodeCount:1}} featuredPosition={{x:45,y:22}} episodeCount={1}/>))
 expect(getComputedStyle(host.querySelector('img')!).objectPosition).toBe('45% 22%')
 await act(async()=>root.unmount());host.remove()
})

it('uses responsive artwork and leaves unselected carousel images unmounted',()=>{
 const show={id:'arc',slug:'arc',title:'Arcane',cover:'/cover.webp',level:'B1',episodeCount:1}
 const active=document.createElement('div');active.innerHTML=renderToStaticMarkup(<FeaturedHero show={show} featuredImage="https://storage.test/storage/v1/object/public/covers/featured/arc.avif" episodeCount={1}/>)
 const image=active.querySelector('img')!
 expect(image.getAttribute('srcset')).toContain('/covers/variants/featured/arc-828.avif')
 expect(image.getAttribute('sizes')).toContain('100vw')
 const deferred=document.createElement('div');deferred.innerHTML=renderToStaticMarkup(<FeaturedHero show={show} featuredImage="https://storage.test/featured/arc.avif" loadImage={false} episodeCount={1}/>)
 expect(deferred.querySelector('img')).toBeNull()
})
