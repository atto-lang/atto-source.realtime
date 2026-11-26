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
 for(const s of [src('42')+' trailing','pub fnc main() -> int { return 42; }',src('42').replace('return','while 1 { } return')])
  assert.throws(()=>compile(s),e=>e.code==='E_VERIFY_UNSUPPORTED');
 assert.throws(()=>compile(src('('.repeat(40)+'1'+')'.repeat(40))),e=>e.code==='RT_PROOF_LIMIT');
});

test('eager immutable scalar values and missing initializers',()=>{
 const s=b=>'type Bounded = int where self >= 1 and self <= 42; pub fnc main() -> int { '+b+' }';
 for(const b of ['val int x=40; val y=x+2; return y;','val x: Bounded=42; val y=x; return y;','val int x=0; return x+42;'])
  assert.equal(compile(s(b)).value,'42');
 assert.equal(compile(s('val x=42; return x;')).value,'42');
 for(const [b,code] of [
  ['val int x; return 42;','E_MISSING_INITIALIZER'],
  ['val x: int; return 42;','E_MISSING_INITIALIZER'],
  ['val x=1/0; return 42;','E_VERIFY_UNPROVEN'],
  ['val Bounded x=43; return 42;','E_VERIFY_UNPROVEN'],
  ['val x=42; val x=1; return x;','E_VERIFY_UNSUPPORTED'],
  ['val main=42; return main;','E_VERIFY_UNSUPPORTED']
 ])assert.throws(()=>compile(s(b)),e=>e.code===code);
});

test('fixed immutable arrays are eager receiver-scoped scalar captures',()=>{
 const s=b=>'type Bounded = int where self >= 1 and self <= 42; pub fnc main() -> int { '+b+' }';
 for(const b of [
  'val a=Array.of(7,42); val i=1; return a[i];',
  'val a=Array.of(40); val b=Array.of(2,9); return a[0]+b[0];',
  'val a=Array.of(42,7); val b=a[0]; return b;'
 ])assert.equal(compile(s(b)).value,'42');
 for(const [b,code] of [
  ['val a=Array.of(42); return a[1];','E_VERIFY_UNPROVEN'],
  ['val a=Array.of(42); return a[-1];','E_VERIFY_UNPROVEN'],
  ['val a=Array.of(42,1/0); return a[0];','E_VERIFY_UNPROVEN'],
  ['val a=Array.of(42); val b=Array.of(1,2); return a[1];','E_VERIFY_UNPROVEN'],
  ['val a=Array.of(42); return a;','E_VERIFY_UNSUPPORTED'],
  ['val a=Array.of(42); val b=a; return 42;','E_VERIFY_UNSUPPORTED'],
  ['val a=Array.of(42); a[0]=0; return 42;','E_VERIFY_UNSUPPORTED'],
  ['val a=Array.of('+Array(17).fill('1').join(',')+'); return 42;','RT_PROOF_LIMIT']
 ])assert.throws(()=>compile(s(b)),e=>e.code===code);
});
