import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const perf=readFileSync(new URL('../stdlib/perf.atto',import.meta.url),'utf8');
const ids=readFileSync(new URL('../stdlib/perf_ids.atto',import.meta.url),'utf8');
const slots=readFileSync(new URL('../stdlib/alloc/perf_trace_slots.atto',import.meta.url),'utf8');
test('realtime clock always comes from an explicit monotonic input',()=>{
 assert.match(perf,/begin_ns\(bool enabled, int now_ns\)/);
 assert.match(perf,/duration_ns\(int started_ns, int finished_ns\)/);
 assert.doesNotMatch(perf,/process\.|stdio\.|await |spawn|clock_gettime|System\./);
 const begin=perf.split('pub fnc begin_ns')[1].split('pub fnc duration_ns')[0];
 assert.ok(begin.indexOf('if !enabled')<begin.indexOf('return now_ns'));
});
test('sampling and trace slot admission have fixed bounds',()=>{
 assert.match(perf,/every_n < 1 \|\| every_n > 65536/);
 assert.match(slots,/capacity >= 1 && capacity <= 65536/);
 assert.match(slots,/occupied >= 0 && occupied < capacity/);
 assert.match(slots,/dropped >= 2147483647/);
 assert.doesNotMatch(slots,/new |Array|malloc|process\.|stdio\.|spawn|await /);
});
test('static IDs remain portable and unique',()=>{
 const rows=[...ids.matchAll(/return (\d+);/g)].map(x=>Number(x[1]));
 assert.deepEqual(rows,[23,24,25,26,27,28,29]);
});
