export interface ReviewCatalogueItem { id:string; title:string; chapter_number?:number }
export function reviewUnitLabel(unit:ReviewCatalogueItem){return unit.chapter_number==null?unit.title:`Chapter ${unit.chapter_number} — ${unit.title}`}
