import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../core/perf_policy.atto',import.meta.url),'utf8');
const code=source.replace(/\/\/[^\n]*/g,'');
const body=(start,end)=>code.split('pub fnc '+start)[1]?.split('pub fnc '+end)[0]??'';
test('five public pure Atto core policies are independently compiled candidates',()=>{
 assert.match(code,/define module core as/);
 for(const name of ['perf_valid_probe','perf_should_sample','perf_duration_ns','perf_can_record','perf_next_dropped'])
  assert.match(code,new RegExp('pub fnc '+name+'\\('));
});
test('no runtime capability, allocation or clock effect is present',()=>{
 assert.doesNotMatch(code,/process\.|stdio\.|import |malloc|new Array|\bnew\b|eval\(|spawn|await |thread/);
});
test('sampling rejects zero divisors then performs overflow-safe integer math',()=>{
 const sample=body('perf_should_sample','perf_duration_ns');
 assert.match(sample,/every_n < 1 \|\| every_n > 65536/);
 assert.ok(sample.indexOf('every_n < 1')<sample.indexOf('sample_key / every_n'));
 assert.match(sample,/\(sample_key \/ every_n\) \* every_n == sample_key/);
 assert.doesNotMatch(sample,/%/);
});
test('full/disabled buffers never record and count saturates',()=>{
 const cap=body('perf_can_record','perf_next_dropped');
 assert.match(cap,/!enabled/);
 assert.match(cap,/capacity < 1 \|\| capacity > 65536/);
 assert.match(cap,/occupied >= 0 && occupied < capacity/);
 const drop=code.split('pub fnc perf_next_dropped')[1];
 assert.match(drop,/dropped >= 2147483647/);
 assert.match(drop,/return dropped \+ 1/);
});
test('elapsed monotonic rollback clamps to zero and cannot overflow',()=>{
 const elapsed=body('perf_duration_ns','perf_can_record');
 assert.match(elapsed,/started_ns <= 0 \|\| finished_ns < started_ns/);
 assert.match(elapsed,/finished_ns - started_ns/);
});
