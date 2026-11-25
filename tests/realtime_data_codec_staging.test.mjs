import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const p=JSON.parse(readFileSync(new URL('../contracts/realtime-data-codec-staging-v1.json',import.meta.url)));
// Reference admission gate only. No runtime dispatch or decode implementation.
function admit(kind,codec){
 if(kind!=='DATA'||typeof codec!=='string'||!p.compiler_supported)return false;
 return p.supported_codecs.includes(codec);
}
test('bootstrap cannot admit a serialized DATA endpoint or default',()=>{
 assert.equal(p.status,'DESIGN_ONLY_NOT_EXECUTED');
 assert.equal(p.compiler_supported,false);
 assert.equal(p.guest_evidence,'NOT_EXECUTED');
 assert.deepEqual(p.supported_codecs,[]);
 assert.equal(p.active_default,null);
 for(const c of [null,undefined,'messagepack','protobuf','cbor','flatbuffers','unknown','__proto__',{},'MessagePack'])assert.equal(admit('DATA',c),false);
});
test('control path and fallback cannot be registered',()=>{
 for(const field of ['dynamic_loading','implicit_fallback','control_serializable'])assert.equal(p[field],false);
 for(const k of ['CONTROL','control','UNKNOWN',null])for(const c of ['messagepack','protobuf','cbor','flatbuffers'])assert.equal(admit(k,c),false);
});
