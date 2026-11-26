import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {compileStrictClosedScalar as compile} from '../src/strict_closed_scalar.mjs';
const header='type Bounded = int where self >= 1 and self <= 42; ';
const source=(init,fallback='42',trap='trap!')=>header+'pub fnc main() -> int { val Option<int> x = '+init+'; return match<int> '+trap+' x.unwrap() over on Ok(n):int -> n, on Err():int -> '+fallback+', end; }';
const cases=[['Some(42)','7','trap!','42'],['Some(0)','42','trap!','0'],['Some(-9223372036854775808)','7','trap!','-9223372036854775808'],['Some(9223372036854775807)','7','trap!','9223372036854775807'],['Some(84/2)','7','trap','42'],['None','42','trap!','42'],['None','-9223372036854775808','trap','-9223372036854775808']];
for(const [init,fallback,trap,want] of cases)test('native closed unwrap '+init+' / '+fallback,()=>{
 const result=compile(source(init,fallback,trap));
 assert.equal(result.profile,'rt-closed-option-unwrap-v0');assert.equal(result.wcetCertified,false);assert.equal(result.value,want);
 const dir=mkdtempSync(join(tmpdir(),'atto-rt-unwrap-'));
 try{
  const c=join(dir,'guest.c'),exe=join(dir,'guest');
  writeFileSync(c,result.c+'#include <stdio.h>\n#include <inttypes.h>\nint main(void){printf("%" PRId64 "\\n",atto_rt_entry());return 0;}\n');
  for(const optimization of ['-O0','-O2']){
   const build=spawnSync('cc',['-std=c11','-Wall','-Wextra','-Werror',optimization,c,'-o',exe],{encoding:'utf8',timeout:10000});
   assert.equal(build.status,0,build.stderr||String(build.error));
   const run=spawnSync(exe,[],{encoding:'utf8',timeout:10000});
   assert.equal(run.status,0,run.stderr||String(run.error));assert.equal(run.stdout,want+'\n');
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('checked unwrap rejects wrong receiver, effects, malformed arms and shadowing',()=>{
 const base=source('None');
 for(const s of [base.replace('x.unwrap','y.unwrap'),base.replace('unwrap()','unwrap(1)'),base.replace('unwrap()','expect()'),base.replace('Err()','Err(e)'),base.replace('-> n,','-> x,'),base.replace('Ok(n)','Ok(x)'),base.replace('Option<int> x','Option<int> true').replace('x.unwrap','true.unwrap'),base.replace('Ok(n)','Ok(await)').replace('-> n,','-> await,'),base.replace('trap! ','trap!'),base.replace('trap! ','trap!\u00a0'),base.replace('trap! ','panic! '),base.replace('val Option<int>','val Result<int,int>'),base.replace('return match<int>','defer cleanup(); return match<int>'),base.replace('Bounded','Option'),base.replace('Bounded','None'),base.replace('-> 42,','-> 42/0,'),base+' trailing',source('None','9223372036854775808')])
  assert.throws(()=>compile(s),e=>['E_VERIFY_UNSUPPORTED','E_VERIFY_UNPROVEN'].includes(e.code),s);
 for(const init of ['Some(42/0)','Some(9223372036854775807+1)','Some(43 as Bounded)'])assert.throws(()=>compile(source(init)),e=>e.code==='E_VERIFY_UNPROVEN');
});
