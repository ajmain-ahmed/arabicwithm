import { mkdir, writeFile } from 'node:fs/promises'
const base='https://raw.githubusercontent.com/google/fonts/main/ofl/amiri/'
await mkdir('public/fonts/review', {recursive:true})
for(const [url,file] of [[base+'Amiri-Regular.ttf','Amiri-Regular.ttf'],[base+'OFL.txt','OFL.txt']]){
 const response=await fetch(url)
 if(!response.ok)throw new Error(`${response.status}: ${url}`)
 await writeFile('public/fonts/review/'+file,Buffer.from(await response.arrayBuffer()))
}
