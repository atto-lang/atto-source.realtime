import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const p=JSON.parse(readFileSync(new URL('../atto-capabilities.json',import.meta.url),'utf8'));

test('realtime backend advertises no unimplemented actor heap guest as supported',()=>{
 assert.equal(p.schema,'atto.repository-capabilities.v1');
 assert.equal(p.repository,'atto-lang/atto-source.realtime');
 assert.equal(p.source_state,'bootstrap_only');
 assert.equal(p.certification,'NOT_CERTIFIED');
 assert.equal(p.reference_abi.word_bits,32);
 assert.equal(p.reference_abi.alignment,8);
 assert.equal(p.reference_abi.max_logical_start_bytes,'34359738352');
 assert.equal(p.reference_abi.status,'NOT_IMPLEMENTED');
 for(const [key,value] of Object.entries(p.implementation)){
   assert.match(key,/^[a-z_]+$/);
   assert.equal(value,key.startsWith('compiled_node_graph_')?'NOT_EXECUTED':'NOT_IMPLEMENTED',key);
 }
 assert.deepEqual(p.evidence,[]);
});
test('real-time target pins the same unexecuted .atto positive/negative corpus',()=>{
 const f=p.canonical_guest_fixtures;
 assert.equal(f.repo,'atto-lang/atto-platform-conformance');
 assert.equal(f.pr,461);
 assert.equal(f.positive_sha,'d472cccb3da24ee8f9fed44f99c1c7742d3240de');
 assert.equal(f.negative_sha,'7544665f302167451fdc47ce11f5f108f703b7ed');
 assert.equal(p.implementation.zero_gc,'NOT_IMPLEMENTED');
 assert.equal(p.implementation.hard_realtime_prefault,'NOT_IMPLEMENTED');
});
