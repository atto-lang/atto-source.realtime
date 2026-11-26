import test from 'node:test';
import assert from 'node:assert/strict';
import {compileStrictClosedScalar as compile} from '../src/strict_closed_scalar.mjs';
const src=e=>'type Bounded = int where self >= 1 and self <= 42; pub fnc main() -> int { return '+e+'; }';
test('closed proof values and fail closed arithmetic',()=>{
 for(const [e,v] of [['84/2','42'],['42 as Bounded','42'],['-9223372036854775808','-9223372036854775808'],['(-3+45)*1','42']]){
  const r=compile(src(e));assert.equal(r.value,v);assert.equal(r.wcetCertified,false);assert.ok(Object.isFrozen(r));assert.match(r.c,/int64_t atto_rt_entry/);
 }
 for(const e of ['42/0','-9223372036854775808/-1','9223372036854775807+1','43 as Bounded','(9223372036854775807+1)*0'])
  assert.throws(()=>compile(src(e)),e=>e.code==='E_VERIFY_UNPROVEN');
 for(const s of [src('42')+' trailing','pub fnc main() -> int { return 42; }',src('42').replace('return','while 1 { } return'),src('42').replace('return 42','val x=42; return x')])
  assert.throws(()=>compile(s),e=>e.code==='E_VERIFY_UNSUPPORTED');
 assert.throws(()=>compile(src('('.repeat(40)+'1'+')'.repeat(40))),e=>e.code==='RT_PROOF_LIMIT');
});
