// Apply only reviewed dictionary entries to JSX interface text/attributes.
// Leaves data keys, URLs, event handlers, educational language and Admin intact.
import ts from 'typescript'
import {readFileSync,writeFileSync,readdirSync} from 'node:fs'
const normalise=text=>text.replace(/[‘’]/g,"'").replace(/[“”]/g,'"')
const keys=new Set()
for(const file of ['app/lib/localisation/messages.ts','app/lib/localisation/learnerMessages.ts','app/lib/localisation/legalMessages.ts','app/lib/localisation/activityMessages.ts']){
 const ast=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true)
 function collect(node){if(ts.isPropertyAssignment(node)&&ts.isStringLiteral(node.name)&&ts.isStringLiteral(node.initializer))keys.add(normalise(node.name.text));ts.forEachChild(node,collect)}collect(ast)
}
const known=text=>keys.has(normalise(text))
const entities={apos:"'",rsquo:'’',lsquo:'‘',quot:'"',ldquo:'“',rdquo:'”',nbsp:' ',amp:'&',lt:'<',gt:'>',ndash:'–',mdash:'—'}
const decode=text=>text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi,(all,key)=>key[0]==='#'?String.fromCodePoint(key[1]==='x'?parseInt(key.slice(2),16):Number(key.slice(1))):entities[key]??all)
function jsxText(raw){return decode(raw.replace(/\t/g,' ').split(/\r?\n/).map((line,i,lines)=>{if(i)line=line.trimStart();if(i<lines.length-1)line=line.trimEnd();return line}).filter(Boolean).join(' '))}
function sourceFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?sourceFiles(`${dir}/${entry.name}`):entry.name.endsWith('.tsx')?[`${dir}/${entry.name}`]:[])}
const files=sourceFiles('app').filter(file=>!/[\\/](?:admin|reviewer)[\\/]|\(admin\)|\.test\.tsx$|cartoons\/components\/(?:ShowEditor|EpisodeEditor)\.tsx$/.test(file))
const report=[]
for(const file of files){
 let source=readFileSync(file,'utf8');const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
 const client=/^[\s\S]{0,100}['"]use client['"]/.test(source),edits=[],scopes=new Set();let textImport=false,hookImport=false
 function component(node){for(let p=node.parent;p;p=p.parent){if(ts.isFunctionDeclaration(p)&&p.body&&((p.name&&/^[A-Z]/.test(p.name.text))||p.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword)))return p;if(ts.isArrowFunction(p)&&ts.isBlock(p.body)&&ts.isVariableDeclaration(p.parent)&&ts.isIdentifier(p.parent.name)&&/^[A-Z]/.test(p.parent.name.text))return p}return null}
 function educational(node){for(let p=node.parent;p;p=p.parent)if(ts.isJsxElement(p)&&p.openingElement.attributes.properties.some(a=>ts.isJsxAttribute(a)&&a.name.text==='lang'&&a.initializer&&ts.isStringLiteral(a.initializer)&&a.initializer.text==='en'))return true;return false}
 function edit(node,replacement){edits.push({start:ts.isJsxText(node)?node.pos:node.getStart(ast),end:node.end,replacement})}
 const textNode=text=>{textImport=true;return `<UiText>{${JSON.stringify(text)}}</UiText>`}
 function wrapLiteral(node){const scope=component(node);if(!client||!scope)return false;scopes.add(scope);hookImport=true;edit(node,`awmT(${JSON.stringify(node.text)})`);return true}
 function visit(node){
  if(ts.isPropertyAssignment(node)&&ts.isStringLiteral(node.name)&&node.name.text==='aria-label'&&ts.isStringLiteral(node.initializer)&&known(node.initializer.text)){wrapLiteral(node.initializer);return}
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(ast)==='UiText')return
  if(educational(node))return
  if(ts.isJsxText(node)){
   const value=jsxText(node.getFullText(ast)),key=value.trim();if(key&&known(key)){const before=value.startsWith(' ')?"{' '}":'',after=value.endsWith(' ')?"{' '}":'';edit(node,before+textNode(key)+after)}return
  }
  if(ts.isJsxAttribute(node)){
   if(!['placeholder','label','title','aria-label','helperText','alt'].includes(node.name.getText(ast))){
    // JSX passed as sidebar/render props is still UI. Data/style/event values
    // remain untouched; descend only as far as a nested JSX tree.
    if(!/^on[A-Z]/.test(node.name.getText(ast))){function nested(child){if(ts.isPropertyAssignment(child)&&ts.isStringLiteral(child.name)&&child.name.text==='aria-label'){visit(child);return}if(ts.isJsxElement(child)||ts.isJsxSelfClosingElement(child)||ts.isJsxFragment(child)){visit(child);return}ts.forEachChild(child,nested)}if(node.initializer)nested(node.initializer)}
    return
   }
   if(node.initializer&&ts.isStringLiteral(node.initializer)&&known(node.initializer.text)){const scope=component(node);if(client&&scope){scopes.add(scope);hookImport=true;edit(node.initializer,`{awmT(${JSON.stringify(node.initializer.text)})}`)}return}
  }
  if(ts.isCallExpression(node)&&['t','awmT','translateMessage'].includes(node.expression.getText(ast)))return
  if(ts.isStringLiteral(node)&&known(node.text)){
   if(ts.isJsxExpression(node.parent)&&!ts.isJsxAttribute(node.parent.parent)){edit(node.parent,textNode(node.text));return}
   // Only direct display values and conditional RESULT branches. Never change
   // comparisons, lookup arrays, callback bodies or object data inside JSX.
   let value=node
   while(ts.isParenthesizedExpression(value.parent))value=value.parent
   while(ts.isConditionalExpression(value.parent)&&(value.parent.whenTrue===value||value.parent.whenFalse===value))value=value.parent
   if(ts.isJsxExpression(value.parent))wrapLiteral(node)
  }
  ts.forEachChild(node,visit)
 }
 visit(ast)
 if(!edits.length)continue
 for(const scope of scopes)if(!/const\s+(?:\{[^}]*\bawmT\b|awmT\b)/.test(scope.body.getText(ast)))edits.push({start:scope.body.getStart(ast)+1,end:scope.body.getStart(ast)+1,replacement:'\n const {t:awmT}=useWebsiteLocale()\n'})
 const imports=[]
 if(textImport&&!/import\s*\{[^}]*\bUiText\b/.test(source))imports.push('UiText')
 if(hookImport&&!/import\s*\{[^}]*\buseWebsiteLocale\b/.test(source))imports.push('useWebsiteLocale')
 if(imports.length){const first=ast.statements[0],pos=ts.isExpressionStatement(first)&&ts.isStringLiteral(first.expression)&&first.expression.text==='use client'?first.end:0;edits.push({start:pos,end:pos,replacement:`\nimport {${imports.join(',')}} from '@/app/components/WebsiteLocaleProvider'\n`})}
 edits.sort((a,b)=>b.start-a.start)
 for(const change of edits)source=source.slice(0,change.start)+change.replacement+source.slice(change.end)
 if(process.argv.includes('--write'))writeFileSync(file,source)
 report.push({file,changes:edits.length})
}
console.log(JSON.stringify({write:process.argv.includes('--write'),files:report.length,changes:report.reduce((n,r)=>n+r.changes,0),report}))
