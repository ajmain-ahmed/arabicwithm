// Read-only source inventory. Candidates require human classification: educational
// English and dynamically assembled strings cannot be classified by AST alone.
import fs from 'node:fs/promises'
import path from 'node:path'
import ts from 'typescript'
const root=process.cwd(),files=[]
async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(ts|tsx)$/.test(file)&&!/(?:\.test\.|\.d\.ts$)/.test(file))files.push(file)}}
await walk(path.join(root,'app'))
const modules=new Map(),relative=file=>path.relative(root,file).replaceAll('\\','/')
const attributes=new Set(['aria-label','title','alt','placeholder','label','helperText','message','description','caption','tooltip','emptyText'])
for(const file of files){
 const source=await fs.readFile(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 const imports=[],strings=[]
 function add(node,kind,text){text=text.replace(/\s+/g,' ').trim();if(/[A-Za-z]{2}/.test(text))strings.push({line:ast.getLineAndCharacterOfPosition(node.getStart(ast)).line+1,kind,text})}
 function visit(node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))imports.push(node.moduleSpecifier.text)
  if(ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&ts.isStringLiteral(node.arguments[0]))imports.push(node.arguments[0].text)
  if(ts.isJsxText(node))add(node,'jsx-text',node.text)
  if(ts.isJsxExpression(node)&&node.expression&&ts.isStringLiteralLike(node.expression))add(node.expression,'jsx-expression',node.expression.text)
  if(ts.isJsxAttribute(node)&&attributes.has(node.name.getText(ast))&&node.initializer){const value=ts.isStringLiteral(node.initializer)?node.initializer:ts.isJsxExpression(node.initializer)?node.initializer.expression:null;if(value&&ts.isStringLiteralLike(value))add(value,'ui-attribute',value.text)}
  if(ts.isNewExpression(node)&&node.expression.getText(ast)==='Error'&&node.arguments?.[0]&&ts.isStringLiteralLike(node.arguments[0]))add(node.arguments[0],'error-message',node.arguments[0].text)
  ts.forEachChild(node,visit)
 }
 visit(ast);modules.set(file,{file:relative(file),imports,strings})
}
function resolveImport(from,spec){const base=spec.startsWith('@/')?path.join(root,spec.slice(2)):spec.startsWith('.')?path.resolve(path.dirname(from),spec):null;if(!base)return null;return [base,base+'.tsx',base+'.ts',path.join(base,'index.tsx'),path.join(base,'index.ts')].find(file=>modules.has(file))}
const routes=[],learnerFiles=new Set()
for(const entry of files.filter(file=>file.endsWith(path.sep+'page.tsx'))){
 const name=relative(entry);if(name.includes('/(admin)/')||name.startsWith('app/reviewer/'))continue
 const seen=new Set(),todo=[entry]
 while(todo.length){const file=todo.pop();if(seen.has(file))continue;seen.add(file);for(const spec of modules.get(file)?.imports??[]){const target=resolveImport(file,spec);if(target&&!seen.has(target))todo.push(target)}}
 // Shared root chrome is inherited, even if a page never imports it itself.
 for(const shared of ['app/components/SiteShell.tsx','app/layout.tsx'])todo.push(path.join(root,shared))
 for(let dir=path.dirname(entry);dir.startsWith(path.join(root,'app'));dir=path.dirname(dir))for(const inherited of ['layout.tsx','error.tsx','loading.tsx','not-found.tsx','global-error.tsx'])todo.push(path.join(dir,inherited))
 while(todo.length){const file=todo.pop();if(seen.has(file)||!modules.has(file))continue;seen.add(file);for(const spec of modules.get(file).imports){const target=resolveImport(file,spec);if(target&&!seen.has(target))todo.push(target)}}
 const candidates=[...seen].flatMap(file=>modules.get(file)?.strings??[])
 for(const file of seen)learnerFiles.add(file)
 routes.push({route:'/'+name.slice(4).replace(/\([^/]+\)\//g,'').replace(/\/?page\.tsx$/,''),entry:name,reachableSourceFiles:seen.size,candidateOccurrences:candidates.length,uniqueCandidateTexts:new Set(candidates.map(row=>row.text)).size,status:'manual-classification-required'})
}
const output={generatedAt:new Date().toISOString(),limitations:['Static JSX text, selected literal UI attributes and Error literals only.','Variable labels, pluralisation, template expressions, database values and runtime-only branches require manual audit.','Intentional educational English must be excluded during review. Counts are candidates, not confirmed translation gaps.','Admin/reviewer routes excluded; shared UI dependencies and inherited route boundaries included.'],routes:routes.sort((a,b)=>a.route.localeCompare(b.route)),sources:[...modules.entries()].filter(([file,row])=>learnerFiles.has(file)&&row.strings.length).map(([, {file,strings}])=>({file,strings}))}
const outArg=process.argv.indexOf('--out');if(outArg<0||!process.argv[outArg+1])throw new Error('Usage: node scripts/audit-localisation.mjs --out <inventory.json>')
const out=path.resolve(process.argv[outArg+1]);await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(output,null,2)+'\n')
console.log(JSON.stringify({routes:routes.length,filesWithCandidates:output.sources.length,candidateOccurrences:output.sources.reduce((n,row)=>n+row.strings.length,0),output:out}))
