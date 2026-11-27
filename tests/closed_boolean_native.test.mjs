import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {compileClosedBoolean as compile} from '../src/closed_boolean.mjs';
const fixture=readFileSync(new URL('./fixtures/boolean-reductions-literal-packs.atto',import.meta.url));
const blob=bytes=>createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
const program=body=>`pub fnc main(): int { ${body} }`;
const gates=['And','Or','Xor'];
function run(command,args){
 const r=spawnSync(command,args,{encoding:'utf8',timeout:60000});
 assert.equal(r.error,undefined,`${command}: ${r.error}`);
 assert.equal(r.signal,null,`${command}: ${r.signal}`);
 assert.equal(r.status,0,`${command}: ${r.stderr}`);
 assert.equal(r.stderr,'',`${command}: unexpected stderr`);
 return r.stdout;
}
const witnesses=[fixture.toString('utf8'),
 program('val bool a = Xor(true,false); val bool b = And(a,true,true); if !Or(b,false) then return 1; fi return 42;'),
 program('if !(And(true,Or(false,Xor(true,false)))) then return 1; fi return 42;'),
 program('if false then return -9223372036854775808; fi return 42;'),
 program('if true then return 42; fi return 9223372036854775807;'),
];
for(let size=0;size<=4;size++)for(let mask=0;mask<2**size;mask++){
 const values=Array.from({length:size},(_,i)=>!!(mask&(1<<i)));
 const count=values.filter(Boolean).length;let body='';
 for(const name of gates){
  const expected=name==='And'?count===size:name==='Or'?count>0:count%2===1;
  for(const arg of [`[${values.join(',')}]`,...(size>=2?[values.join(',')]:[])])
   body+=`if ${expected?'!':''}${name}(${arg}) then return 1; fi `;
 }
 witnesses.push(program(body+'return 42;'));
}
const expected=witnesses.map(()=> 'INT64_C(42)');
for(const [src,value] of [
 [program('if And(true,false) then return 42; fi return 7;'),'INT64_C(7)'],
 [program('if Xor(true,true,true) then return 11; fi return 42;'),'INT64_C(11)'],
 [program('if Or([]) then return 42; fi return -9223372036854775808;'),'INT64_MIN'],
 [program('if And([]) then return 9223372036854775807; fi return 42;'),'INT64_MAX'],
 [program('if !And('+Array(32).fill('true').join(',')+') then return 1; fi return 42;'),'INT64_C(42)'],
]){witnesses.push(src);expected.push(value);}
test('canonical shared literal pack witness is byte-pinned',()=>{
 assert.equal(blob(fixture),'fa60d9e290101ef839fb4c4197ecd0d05274baff');
});
for(const cc of ['gcc','clang'])for(const opt of ['-O0','-O2'])test(`actual emitted native C: ${cc} ${opt}`,()=>{
 const dir=mkdtempSync(join(tmpdir(),'atto-rt-bool-'));
 try{
  let driver='#include <stdint.h>\n#include <stdio.h>\n';
  for(const [i,src] of witnesses.entries()){
   const r=compile(src);assert.equal(r.wcetCertified,false);assert.equal(r.profile,'rt-closed-pure-bool-v0');
   assert.equal(r.c,compile(src).c,'deterministic lowering');
   writeFileSync(join(dir,`guest${i}.c`),r.c,{flag:'wx'});
   driver+=`#define atto_rt_entry guest${i}\n#include "guest${i}.c"\n#undef atto_rt_entry\n`;
  }
  driver+='int main(void) {\n';
  for(let i=0;i<witnesses.length;i++)driver+=`  if (guest${i}() != ${expected[i]}) return ${i+1};\n`;
  driver+=`  puts("${witnesses.length} native guests passed"); return 0;\n}\n`;
  const main=join(dir,'driver.c'),out=join(dir,'run');writeFileSync(main,driver,{flag:'wx'});
  assert.equal(run(cc,['-std=c11',opt,'-Wall','-Wextra','-Werror',main,'-o',out]),'');
  assert.equal(run(out,[]),`${witnesses.length} native guests passed\n`);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('invalid and unsupported source rejects before C publication',()=>{
 for(const name of gates)for(const args of ['', 'true','true,1','false,1','[true,1]','[[true]]','[true],[false]','true,','['+Array(33).fill('true').join(',')+']'])
  assert.throws(()=>compile(program(`if ${name}(${args}) then return 1; fi return 42;`)),/E_RT_BOOL_(UNSUPPORTED|LIMIT)/);
 for(const body of ['if true || And(false,1) then return 42; fi return 0;',
  'if false && Or(true,1) then return 42; fi return 0;',
  'val bool a = 1; return 42;','val bool And = true; return 42;',
  'val bool a = a; return 42;','val bool a = true; val bool a = false; return 42;',
  'val bool a = true; if a[0] then return 42; fi return 0;',
  'if Xor([true],false) then return 42; fi return 0;',
  'if true then return 42; fi if And(true,1) then return 1; fi return 0;',
  'if true then return 9223372036854775808; fi return 42;',
  'if '+'!'.repeat(40)+'true then return 42; fi return 0;',
  'return 42; } trailing', 'if stdio() then return 42; fi return 0;'])
  assert.throws(()=>compile(program(body)),/E_RT_BOOL_(UNSUPPORTED|LIMIT)/);
});
