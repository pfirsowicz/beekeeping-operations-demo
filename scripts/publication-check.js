import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
const root = resolve(import.meta.dirname,'..');
const excluded = new Set(['.DS_Store','.git','node_modules','coverage']);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:ghp|gho|ghu|ghs)_[A-Za-z0-9]{30,}/,
  /(?:sk_live|sk_test)_[A-Za-z0-9]{16,}/,
  /AIza[A-Za-z0-9_-]{30,}/,
  /(?:postgres(?:ql)?|mysql):\/\/[^\s'"`]+@/i,
  /https:\/\/[a-z0-9.-]+\.supabase\.co/i,
  /(?:service[_-]?role|sb_secret)["'\s:=]+[A-Za-z0-9._-]{20,}/i,
  /\b(?:app[s]?\.firsowicz\.com|matedqueens\.nz)\b/i
];
let files = 0,failures=[];
async function scan(path) {
  for(const e of await readdir(path,{withFileTypes:true})) {
    if(excluded.has(e.name)) continue;
    const file=join(path,e.name);
    if(e.isDirectory()) await scan(file);
    else if(e.isSymbolicLink()) failures.push(`Symlink requires manual publication review: ${file}`);
    else if(e.isFile() && file !== join(root,'scripts','publication-check.js')){
      files++;
      const text=await readFile(file,'utf8');
      for(const pattern of patterns) if(pattern.test(text)) failures.push(`${file.replace(root+'/','')}: forbidden credential or production reference pattern`);
    }
  }
}
await scan(root);
for(const f of ['.env','.env.local','credentials.json']) {
  try { await stat(join(root,f));failures.push(`Forbidden root file present: ${f}`); } catch(e) { if(e.code!=='ENOENT') throw e; }
}
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
else console.log(`Public-content checks passed: ${files} repository files (scanner source excluded); no recognized credential or production references.`);
