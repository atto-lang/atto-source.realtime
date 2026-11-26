import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {emitCountedSingle} from '../src/counted-static-single.mjs';
const corpus=process.argv[2];if(!corpus)throw Error('exact corpus required');
const dir=mkdtempSync(join(tmpdir(),'atto-counted-single-'));
const target="c",positives=new Set(["counted-three","counted-one","counted-zero","counted-alias"]);
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:60000});assert.equal(r.status,0,r.stderr+' '+r.stdout);return r.stdout.trim();}
function execute(source,value,status){
 const artifact=emitCountedSingle(source,target);
 if(target==='c'){
  writeFileSync(join(dir,'guest.c'),artifact+'\n#include <stdio.h>\nint main(void){int64_t value=0;int status=atto_counted_entry(&value);printf("%d %lld\\n",status,(long long)value);return 0;}');
  run('cc',['-std=c11','-O1','-fsanitize=undefined','-fno-sanitize-recover=all',join(dir,'guest.c'),'-o',join(dir,'guest')]);
  assert.equal(run(join(dir,'guest'),[]),status+' '+value);
 }else{
  writeFileSync(join(dir,'guest.sv'),artifact);
  writeFileSync(join(dir,'tb.sv'),'module tb; reg enable=0; wire signed [63:0] result; wire [1:0] status; atto_counted dut(enable,result,status); initial begin #1; enable=1; #1; if(status!==2\'d'+status+' || result!==64\'sd'+value+') $fatal(1,"bad result"); enable=0; #1; if(result!==0 || status!==0) $fatal(1,"disabled"); enable=1; #1; if(status!==2\'d'+status+' || result!==64\'sd'+value+') $fatal(1,"repeat"); $display("PASS"); $finish; end endmodule');
  run('iverilog',['-g2012','-s','tb','-o',join(dir,'sim'),join(dir,'guest.sv'),join(dir,'tb.sv')]);assert.match(run('vvp',[join(dir,'sim')]),/PASS/);
  run('yosys',['-Q','-p','read_verilog -sv '+join(dir,'guest.sv')+'; synth -top atto_counted; check -assert; write_verilog '+join(dir,'net.v')]);
  run('iverilog',['-g2012','-s','tb','-o',join(dir,'net_sim'),join(dir,'net.v'),join(dir,'tb.sv')]);assert.match(run('vvp',[join(dir,'net_sim')]),/PASS/);
 }
}
try{
 const cases=[{"id":"counted-three","path":"counted-three.atto","blob":"6531efa0689f2a5728b40a6412651e8143e45865"},{"id":"counted-zero","path":"counted-zero.atto","blob":"42e49fc1eea64b31e86ec722e1457c1ab706a7e1"},{"id":"counted-one","path":"counted-one.atto","blob":"910062ebf96613d15a16ddb080abd89375d7709c"},{"id":"counted-alias","path":"counted-alias.atto","blob":"324837078af3e7eeb9b619d0fb07142f0a0d6291"},{"id":"reject-counted-negative","path":"reject-counted-negative.atto","blob":"e2ff6fdb406b8807b74fa15beaee10a7f9438e22"},{"id":"reject-counted-bool","path":"reject-counted-bool.atto","blob":"4a52c22442bc8a9fe55eb95b23722595db32c97e"},{"id":"reject-counted-scalar","path":"reject-counted-scalar.atto","blob":"a2a2dd184237f17b5e8d455f498719ef1ed01d97"},{"id":"reject-counted-default","path":"reject-counted-default.atto","blob":"0c67c1fc8eaf55df6abb2b0fe7d2ce80f169bc69"},{"id":"reject-counted-write","path":"reject-counted-write.atto","blob":"63fa3c9add56f3793e6d755f006cd3568acf1f04"},{"id":"counted-dynamic","path":"counted-dynamic.atto","blob":"7c9ea9270d766612de0d502147e0df31b0dc3454"},{"id":"counted-dynamic-zero","path":"counted-dynamic-zero.atto","blob":"4707b13d3daebe05ced967418ba120cf801e2d8c"},{"id":"reject-counted-dynamic-bool","path":"reject-counted-dynamic-bool.atto","blob":"36cd372a5385e34f2e3bd8dd936e4e0491052633"},{"id":"reject-counted-dynamic-unknown","path":"reject-counted-dynamic-unknown.atto","blob":"0e61da7a98987ed5a182148538b35b8a890abf26"},{"id":"counted-mixed-future-alias","path":"counted-mixed-future-alias.atto","blob":"8f57de03c9fb44eb5594c99a7095f34b702a266a"},{"id":"counted-multi-channel-fair","path":"counted-multi-channel-fair.atto","blob":"4b9b79b9b8670f5b282d33e63b7a4b5691c2979a"},{"id":"counted-mixed-zero","path":"counted-mixed-zero.atto","blob":"458323db6019da434b97e5b966ee646411310acf"},{"id":"counted-distinct-alias-projection","path":"counted-distinct-alias-projection.atto","blob":"5baca9bb9eb4b98500cab770888a45fb60bbf10d"}];
 for(const c of cases){const raw=readFileSync(join(corpus,c.path));assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),c.blob);
  if(positives.has(c.id)){execute(raw.toString('utf8'),42,0);console.log('GUEST_PASS',c.id);}
  else{assert.throws(()=>emitCountedSingle(raw.toString('utf8'),target),e=>e.code==='E_COUNTED_STATIC_SINGLE');console.log('REJECT_PASS',c.id);}
 }
 const p='suspends fnc main(): int { val Channel<int> a = Channel.new<int>(1); ';
 execute(p+'writech a, 9223372036854775807; val Array[int] b = await select<int>(1) { when readch a: int n -> { return n + 1; } }; return b[0]; }',0,1);
 execute(p+'writech a, 42; val Array[int] b = await select<int>(0) { when readch a: int n -> { return n + 9223372036854775807; } }; return readch a; }',42,0);
 console.log('COUNTED_STATIC_SINGLE_PASS '+target+' 4 exact guests, 13 denials, 2 controls');
}finally{rmSync(dir,{recursive:true,force:true});}
