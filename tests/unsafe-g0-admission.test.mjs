import test from 'node:test';
import assert from 'node:assert/strict';
import {compileStrictClosedScalar} from '../src/strict_closed_scalar.mjs';
import {compileClosedBoolean} from '../src/closed_boolean.mjs';
import {parseCountedSingle,emitCountedSingle} from '../src/counted-static-single.mjs';

const strict = body => 'type Bounded = int where self >= 0 and self <= 42; pub fnc main() -> int { '+body+' }';
const boolean = body => 'pub fnc main(): int { '+body+' }';
const denied = fn => assert.throws(fn, e => e.code === 'E_UNSAFE_UNSUPPORTED');

test('strict scalar and closed Boolean reject exact unsafe token before emission', () => {
  for (const [compile,wrap] of [[compileStrictClosedScalar,strict],[compileClosedBoolean,boolean]]) {
    denied(() => compile(wrap('unsafe { } return 42;')));
    denied(() => compile(wrap('return 42;') + ' unsafe'));
    denied(() => compile(wrap('return 42;').replace('pub fnc','pub unsafe fnc')));
    denied(() => compile(wrap('return 42;').replace('main','unsafe')));
  }
  denied(() => compileStrictClosedScalar(strict('val int unsafe=42; return unsafe;')));
  denied(() => compileClosedBoolean(boolean('val bool unsafe=true; if unsafe then return 42; fi return 0;')));
});

test('safe controls preserve identifier prefixes and supported comments', () => {
  assert.equal(compileStrictClosedScalar(strict('val int unsafe_tools=42; return unsafe_tools;')).value,'42');
  assert.match(compileClosedBoolean(boolean('val bool unsafe_tools=true; if unsafe_tools then return 42; fi return 0;')).c,/INT64_C\(42\)/);
  assert.match(compileClosedBoolean(boolean('// unsafe\nreturn 42;')).c,/INT64_C\(42\)/);
  denied(() => compileClosedBoolean(boolean('// inert\runsafe { } return 42;')));
});

test('counted-ready parser and emitter deny unsafe before source lowering', () => {
  for (const source of ['unsafe','pub unsafe fnc main(): int { return 42; }','// comment\runsafe','val unsafe=42;']) {
    denied(() => parseCountedSingle(source));
    denied(() => emitCountedSingle(source,'c'));
  }
});


test('counted-ready suspension aliases preserve exact-token rejection and valid names',()=>{
 const source=spelling=>'pub '+spelling+' fnc main(): int { val Channel<int> unsafe_tools = Channel.new<int>(2); writech unsafe_tools, 42; val Array<int> a = await select<int>(1) fair over when readch unsafe_tools: int n -> { return n; } end; return a[0]; }';
 const c=emitCountedSingle(source('suspends'),'c'),sv=emitCountedSingle(source('suspends'),'sv');
 for(const spelling of ['suspends','susp','⧖','∂']){
  const s=source(spelling);
  assert.equal(emitCountedSingle(s,'c'),c);
  assert.equal(emitCountedSingle(s,'sv'),sv);
  assert.equal(emitCountedSingle(s+' // unsafe','c'),c);
  denied(()=>parseCountedSingle(s.replaceAll('unsafe_tools','unsafe')));
  denied(()=>emitCountedSingle(s+' unsafe','sv'));
 }
});
