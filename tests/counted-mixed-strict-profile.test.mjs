import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {compileStrictClosedScalar} from '../src/strict_closed_scalar.mjs';

const fixtures=[{"name":"counted-distinct-alias-projection","sha":"5baca9bb9eb4b98500cab770888a45fb60bbf10d"},{"name":"counted-mixed-future-alias","sha":"8f57de03c9fb44eb5594c99a7095f34b702a266a"},{"name":"counted-multi-channel-fair","sha":"4b9b79b9b8670f5b282d33e63b7a4b5691c2979a"},{"name":"counted-mixed-zero","sha":"458323db6019da434b97e5b966ee646411310acf"}];
test('exact shared mixed counted source remains unsupported by strict closed-scalar real-time compiler',()=>{
  for(const f of fixtures){
    const raw=readFileSync(new URL('./fixtures/select-source-v2/'+f.name+'.atto',import.meta.url));
    assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),f.sha);
    assert.throws(()=>compileStrictClosedScalar(raw.toString('utf8')),e=>e.code==='E_VERIFY_UNSUPPORTED',f.name);
  }
});
test('contextual counted headers never emit a strict scalar C artifact',()=>{
  for(const prefix of ['select','nb select','await select','await nb select'])
    for(const header of ['(0)','<int>(3)','(count)','(true)']){
      const source='type Bound = int where self >= 0 and self <= 64; pub fnc main() -> int { return '+prefix+header+' over when readch c: int n -> { return n; } end; }';
      assert.throws(()=>compileStrictClosedScalar(source),e=>e.code==='E_VERIFY_UNSUPPORTED',source);
    }
});
test('actual emitted strict scalar C control links and runs, not a WCET proof',()=>{
  const ir=compileStrictClosedScalar('type Bound = int where self >= 0 and self <= 64; pub fnc main() -> int { return 40+2; }');
  assert.equal(ir.wcetCertified,false);
  const dir=mkdtempSync(join(tmpdir(),'atto-rt-select-'));
  try{
    writeFileSync(join(dir,'guest.c'),ir.c+'\nint main(void){return atto_rt_entry()==42?0:1;}\n');
    const cc=spawnSync('cc',['-std=c11','-Wall','-Wextra','-Werror',join(dir,'guest.c'),'-o',join(dir,'guest')],{encoding:'utf8'});
    assert.equal(cc.status,0,cc.stderr);
    const guest=spawnSync(join(dir,'guest'),[],{encoding:'utf8',timeout:3000});
    assert.equal(guest.status,0,guest.stderr);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
