import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCountedSingle,emitCountedSingle} from '../src/counted-static-single.mjs';
const source=`pub suspends fnc main(): int {
 val Channel<int> c = Channel.new<int>(2);
 writech c, 42;
 val Array<int> a = await select<int>(1) fair over
 when readch c: int n -> { return n; } end;
 return a[0];
}`;
test('four suspension modifiers emit identical bounded C and RTL',()=>{
 for(const spelling of ['suspends','susp','⧖','∂']){
   const s=source.replace('pub suspends','pub '+spelling);
   assert.deepEqual(parseCountedSingle(s),parseCountedSingle(source));
   for(const target of ['c','sv']) assert.equal(emitCountedSingle(s,target),emitCountedSingle(source,target));
   assert.throws(()=>parseCountedSingle(s.replace('writech c, 42;','')),/statically would suspend/);
   assert.throws(()=>parseCountedSingle(s.replace('pub '+spelling,'pub suspends '+spelling)),/expected fnc/);
   assert.throws(()=>parseCountedSingle(s.replace('Channel<int> c','Channel<int> '+spelling)),/lexical name/);
   assert.deepEqual(parseCountedSingle(s+' // '+spelling),parseCountedSingle(source));
 }
 assert.throws(()=>parseCountedSingle(source.replace('suspends','▽')),/bounded ASCII source/);
});
test('UTF-8 source size budget counts bytes rather than code units',()=>{
 const prefix=source.replace('suspends','∂')+' // ';
 const padding='∂'.repeat(Math.ceil((16385-Buffer.byteLength(prefix))/3));
 assert.throws(()=>parseCountedSingle(prefix+padding),/bounded ASCII source/);
});
