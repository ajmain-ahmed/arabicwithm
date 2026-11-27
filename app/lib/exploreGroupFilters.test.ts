import {expect,it} from 'vitest'
import {cleanExploreGroups,ENGLISH_EXPLORE_GROUP,isEnglishExploreGroup} from './exploreGroupFilters'
it('removes canonical and legacy English selections while retaining other filters',()=>{
 expect(cleanExploreGroups([ENGLISH_EXPLORE_GROUP,'english','stories'])).toEqual(['stories'])
 expect(cleanExploreGroups(['old','stories'],[{id:'old',name:' English '}])).toEqual(['stories'])
 expect(isEnglishExploreGroup({id:ENGLISH_EXPLORE_GROUP,name:'Renamed'})).toBe(true)
})
