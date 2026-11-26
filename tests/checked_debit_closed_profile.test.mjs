// Closed scalar projection of the shared contract, NOT interprocedural parity.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const cli=fileURLToPath(new URL('../bin/atto-rt-compile.mjs',import.meta.url));
const bytes=readFileSync(new URL('../contracts/atto-xo-checked-debit-v1/cases.tsv',import.meta.url));
assert.equal(createHash('sha256').update(bytes).digest('hex'),'e6e3394d5d62ec1f8171053b74a3b68389c41d5c797d81c14f561d1ca097a28b');
const rows=bytes.toString('utf8').trimEnd().split('\n').map(line=>line.split('|'));
assert.equal(rows.length,7);
assert.deepEqual(rows.map(r=>[r[0],r[1]]),[
 ['normal','42'],['control','43'],['max-valid','42'],
 ['fee-overflow','overflow'],['notional-overflow','overflow'],
 ['overflow-cancel','overflow'],['overflow-dead-result','overflow']
]);
for(const row of rows)assert.equal(row.length,8);
function invoke(command,args){
 const r=spawnSync(command,args,{encoding:'utf8',timeout:15000,maxBuffer:1024*1024});
 assert.equal(r.error,undefined,String(r.error));assert.equal(r.signal,null);return r;
}
for(const [id,want,price,shares,fee,op,rhs,original] of rows){
 test(id+' exact portable guest is unsupported; closed projection is explicit',()=>{
  const dir=mkdtempSync(join(tmpdir(),'atto-rt-debit-'));
  try{
   const src=join(dir,'guest.atto'),c=join(dir,'guest.c'),exe=join(dir,'guest');
   writeFileSync(src,original);
   let r=invoke(process.execPath,[cli,'--verify=strict',src,c]);
   assert.equal(r.status,1,r.stderr);
   assert.match(r.stderr,/E_VERIFY_UNSUPPORTED/);
   assert.equal(existsSync(c),false,'unsupported guest published artifact');
   // Do not conflate this explicitly rewritten, closed expression with
   // the original function-call program or runtime overflow handling.
   assert.ok(['+','-','*'].includes(op));
   const expression='('+price+'*'+shares+'+'+fee+')'+op+rhs;
   writeFileSync(src,'type Bounded = int where self >= 1 and self <= 42; pub fnc main() -> int { return '+expression+'; }');
   r=invoke(process.execPath,[cli,'--verify=strict',src,c]);
   if(want==='overflow'){
    assert.equal(r.status,1,r.stderr);
    assert.match(r.stderr,/E_VERIFY_UNPROVEN/);
    assert.equal(existsSync(c),false,'unproved expression published artifact');
   }else{
    assert.equal(r.status,0,r.stderr);assert.equal(r.stderr,'');
    const observer=join(dir,'observer.c');
    writeFileSync(observer,'#include <stdint.h>\n#include <stdio.h>\n#include <inttypes.h>\nextern int64_t atto_rt_entry(void);\nint main(void){printf("%" PRId64 "\\n",atto_rt_entry());return 0;}\n');
    for(const opt of ['-O0','-O2']){
     const build=invoke('cc',['-std=c11','-Wall','-Wextra','-Werror',opt,c,observer,'-o',exe]);
     assert.equal(build.status,0,build.stderr);
     const run=invoke(exe,[]);assert.equal(run.status,0,run.stderr);
     assert.equal(run.stdout,want+'\n');assert.equal(run.stderr,'');
    }
   }
  }finally{rmSync(dir,{recursive:true,force:true});}
 });
}
