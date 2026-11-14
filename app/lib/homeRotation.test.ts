import { expect, it } from 'vitest'
import { dailyHomeOrder, homeCalendarDay } from './homeRotation'

const pool = Array.from({ length: 25 }, (_, index) => ({ id: String(index) }))
it.each(['shows', 'books'] as const)('keeps %s stable across repeated refreshes and input order, varies tomorrow, and restores yesterday', section => {
 const today = new Date('2026-11-13T12:00:00Z')
 const first = dailyHomeOrder(pool, section, today)
 for(let refresh=0;refresh<10;refresh++)expect(dailyHomeOrder([...pool].reverse(),section,today)).toEqual(first)
 expect(dailyHomeOrder(pool,section,new Date('2026-11-14T12:00:00Z'))).not.toEqual(first)
 expect(dailyHomeOrder(pool,section,today)).toEqual(first)
 expect(new Set(first.map(item=>item.id)).size).toBe(pool.length)
 expect(pool[0].id).toBe('0')
})
it('uses independent section seeds and shuffles before the display limit',()=>{
 const now=new Date('2026-11-13T12:00:00Z')
 expect(dailyHomeOrder(pool,'shows',now)).not.toEqual(dailyHomeOrder(pool,'books',now))
 expect(dailyHomeOrder(pool,'shows',now).slice(0,12).some(item=>Number(item.id)>11)).toBe(true)
})
it('changes at London midnight, including summer time and DST transitions',()=>{
 expect(homeCalendarDay(new Date('2026-07-01T22:59:59Z'))+1).toBe(homeCalendarDay(new Date('2026-07-01T23:00:00Z')))
 expect(homeCalendarDay(new Date('2026-10-24T23:30:00Z'))).toBe(homeCalendarDay(new Date('2026-10-25T23:30:00Z')))
})

it('changes the leading item even for a small pool on consecutive days', () => {
 for (const section of ['shows', 'books'] as const) {
  for (const count of [2, 3, 25]) {
   const items=pool.slice(0,count)
   for(let day=0;day<30;day++) {
    const now=new Date(Date.UTC(2026,10,1+day,12))
    const tomorrow=new Date(Date.UTC(2026,10,2+day,12))
    expect(dailyHomeOrder(items,section,now)[0]).not.toEqual(dailyHomeOrder(items,section,tomorrow)[0])
   }
  }
 }
})
