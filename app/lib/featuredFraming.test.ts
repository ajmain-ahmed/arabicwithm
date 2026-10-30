import {expect,it} from 'vitest'
import {dragFeaturedPosition,featuredObjectPosition} from './featuredFraming'
it('maps vertical drags to cover overflow without stretching or changing the other axis',()=>{
 expect(dragFeaturedPosition({x:50,y:50},100,50,{width:1000,height:400},{width:1000,height:800})).toEqual({x:50,y:37.5})
 expect(dragFeaturedPosition({x:50,y:50},0,-10000,{width:1000,height:400},{width:1000,height:800})).toEqual({x:50,y:100})
})
it('uses the mobile horizontal cover overflow and shared CSS focal point',()=>{
 const result=dragFeaturedPosition({x:50,y:50},30,10,{width:300,height:500},{width:1000,height:500})
 expect(result.x).toBeCloseTo(50-30/700*100);expect(result.y).toBe(50)
 expect(featuredObjectPosition({x:45,y:22})).toBe('45% 22%')
})
