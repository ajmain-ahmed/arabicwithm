import {it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import {ForYouWords} from './ForYouFeed'

it('renders available English beneath Arabic, including on narrow layouts',()=>{
 const html=renderToStaticMarkup(<ForYouWords tokens={[{arabic:'من',english:'from'},{arabic:'سالف',english:'bygone'},{arabic:'الزمان',english:'time'}]}/>)
 const doc=new DOMParser().parseFromString(html,'text/html')
 expect([...doc.querySelectorAll('[lang="en"]')].map(e=>e.textContent)).toEqual(['from','bygone','time'])
 expect([...doc.querySelectorAll('[lang="ar"]')].map(e=>e.textContent)).toEqual(['من','سالف','الزمان'])
})
