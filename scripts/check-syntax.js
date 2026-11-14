'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const skip=new Set(['node_modules','.git','.next','dist','coverage']);
const files=[];
function walk(dir){
 for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(skip.has(entry.name))continue;
  const full=path.join(dir,entry.name);
  if(entry.isDirectory())walk(full);
  else if(entry.isFile()&&/\.(?:js|cjs|mjs)$/.test(entry.name))files.push(full);
 }
}
walk(root);
files.sort();
let failed=0;
for(const file of files){
 const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 if(result.status!==0){
  failed++;
  console.error('SYNTAX FAIL '+path.relative(root,file));
  console.error(result.stderr||result.stdout);
 }
}
console.log('Syntax checked '+files.length+' JavaScript files; failures: '+failed);
if(failed)process.exitCode=1;
