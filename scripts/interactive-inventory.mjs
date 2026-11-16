import ts from 'typescript'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
const rows=[]
const tags=new Set(['button','a','form','Button','IconButton','Fab','Link','Tab','Tabs','Select','MenuItem','ToggleButton','TextField','Checkbox','Switch','Slider','Pagination'])
function walk(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(file.endsWith('.tsx')&&!file.includes('.test.')){
 const source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
 function visit(node){
  if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
   const tag=node.tagName.getText(source),attributes=node.attributes.properties.filter(ts.isJsxAttribute)
   const handlers=attributes.map(a=>a.name.getText(source)).filter(name=>/^on(?:Click|Change|Submit|Key|Pointer|Drag|Drop|Close|Open)/.test(name))
   if(tags.has(tag)||handlers.length){const href=attributes.find(a=>a.name.getText(source)==='href')?.initializer
    rows.push({file:file.replaceAll('\\','/'),line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,tag,handlers:handlers.join(';'),href:href?.getText(source)??'',disabled:attributes.some(a=>a.name.getText(source)==='disabled')})
   }
  }
  ts.forEachChild(node,visit)
 }
 visit(source)
}}}
walk('app')
const quote=value=>'"'+String(value).replaceAll('"','""')+'"'
writeFileSync('docs/validation/full-reliability/interactive-inventory.csv',['file,line,element,handlers,href,has_disabled_prop',...rows.map(r=>[r.file,r.line,r.tag,r.handlers,r.href,r.disabled].map(quote).join(','))].join('\n'))
writeFileSync('docs/validation/full-reliability/interactive-summary.json',JSON.stringify({elements:rows.length,files:new Set(rows.map(r=>r.file)).size,withHandlers:rows.filter(r=>r.handlers).length,withHref:rows.filter(r=>r.href).length,note:'Source inventory; this does not assert runtime coverage for every control.'},null,2))
console.log(`${rows.length} interactive elements across ${new Set(rows.map(r=>r.file)).size} files`)
