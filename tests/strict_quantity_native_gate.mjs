// Material compiled native kernel execution, not a mock realtime runtime.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const compiler=resolve(process.argv[2]??'');
assert.ok(process.argv[2]);
const cxx=process.env.CXX??'c++';
const work=mkdtempSync(join(tmpdir(),'atto-rt-seed-'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const pre='define dimension Time; define dimension Length; define unit Second: Time; define unit Millis: Time = Second / 1000; define unit Meter: Length; type Bounded = int where self >= 1 and self <= 42; type Positive = int where self > 0 and units in Second;';
const source=body=>pre+' pub fnc main() -> int { '+body+' }';
function run(cmd,args,input){
 const r=spawnSync(cmd,args,{cwd:work,input,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});if(r.error)throw r.error;assert.equal(r.signal,null,cmd);return r;
}
const ok=(r,id)=>assert.equal(r.status,0,id+': '+r.stderr);
const good=[
 ['return 42;',42n],['return 84.<Second>/2.<Second>;',42n],
 ['return 84_000<Millis>.to_unit<Second>()/2<Second>;',42n],
 ['return (21.<Meter>*2.<Second>)/(1.<Second>*1.<Meter>);',42n],
 ['return <Bounded>(40+2);',42n],['return 42::<Bounded>;',42n],
 ['return 42 as Bounded;',42n],['val Positive t=42<Second>; return t/1<Second>;',42n],
 ['val n=84<Second>; val x=n/2<Second>; return x;',42n],
 ['return -9223372036854775808;',-(1n<<63n)],
 ['return 9223372036854775807;', (1n<<63n)-1n],
 ['return 0;',0n],
];
const bad=[
 ['return 1/0;','E_VERIFY_UNPROVEN'],
 ['return -9223372036854775808/-1;','E_VERIFY_UNPROVEN'],
 ['return 9223372036854775807+1;','E_VERIFY_UNPROVEN'],
 ['return (9223372036854775807+1)*0;','E_VERIFY_UNPROVEN'],
 ['return 43 as Bounded;','E_VERIFY_UNPROVEN'],
 ['val x=1/0; return 42;','E_VERIFY_UNPROVEN'],
 ['return 1<Second>/1<Millis>;','E_UNIT_ERASURE'],
 ['return 1<Second>+1<Meter>;','E_UNIT_DIMENSION'],
 ['return 1500<Millis>.to_unit<Second>()/1<Second>;','E_UNIT_INEXACT'],
 ['return 1<Second>.<Meter>;','E_UNIT_ATTACHMENT'],
 ['return 42.<Missing>;','E_UNIT_NAME'],
 ['return 1%2;','E_VERIFY_UNSUPPORTED']
];
// Use the same checked callable profile as the exact Forge frontend.
const header='fnc f(int x) -> int requires x >= 1 requires x <= 42';
const tail=' pub fnc main() -> int { return f(2); }';
for(const body of [' { return 84/x; }','\nbegin return 84/x; end',' :: return 84/x; end','\n:: return 84/x; end'])
 good.push([header+body+tail,42n,true]);
for(const body of [' begin return 84/x; end',' :: return 84/x; }',' :: return 84/x;',' :: begin return 84/x; end'])
 bad.push([header+body+tail,'E_PARSE_SYNTAX',true]);
try{
 const cpp=join(work,'kernel.cpp'),obj=join(work,'kernel.o'),host=join(work,'host.cpp'),bin=join(work,'guest');
 writeFileSync(host,'#include <cstdint>\n#include <cstdio>\n#include <cinttypes>\nextern "C" std::int64_t atto_realtime_entry() noexcept;\nint main(){std::printf("%" PRId64 "\\n",atto_realtime_entry());}\n');
 for(const [body,expected,full] of good){
  const src=full?pre+' '+body:source(body),r=run(compiler,[],src);ok(r,body);assert.equal(r.stderr,'');
  writeFileSync(cpp,r.stdout);
  ok(run(cxx,['-std=c++20','-Wall','-Wextra','-Werror','-O2','-ffreestanding','-fno-exceptions','-fno-rtti','-fno-stack-protector','-c',cpp,'-o',obj]),body+' object');
  const nm=run('nm',['-u',obj]);ok(nm,body+' symbols');assert.equal(nm.stdout.trim(),'',body+' unresolved symbols');
  const dis=run('objdump',['-d',obj]);ok(dis,body+' disassembly');assert.ok(!/\bcallq?\b/.test(dis.stdout),body+' unexpected call');
  ok(run(cxx,['-std=c++20',host,obj,'-o',bin]),body+' link');
  const guest=run(bin,[]);ok(guest,body+' guest');assert.equal(guest.stdout,expected.toString()+'\n');assert.equal(guest.stderr,'');
  console.log('RT_NATIVE_KERNEL_PASS '+sha(src)+' '+sha(readFileSync(obj))+' '+expected);
 }
 for(const [body,category,full] of bad){
  const src=full?pre+' '+body:source(body);
  const r=run(compiler,[],src);assert.equal(r.status,2,body);assert.equal(r.stdout,'',body);assert.match(r.stderr,new RegExp('^'+category),body);
  console.log('RT_STATIC_REJECT '+category+' '+sha(src));
 }
 for(const [src,category] of [['pub fnc main()->int {return 42;}','E_VERIFY_UNSUPPORTED'],['x'.repeat(16385),'E_SOURCE_LIMIT'],['\0','E_SOURCE_NUL']]){
  const r=run(compiler,[],src);assert.equal(r.status,2);assert.equal(r.stdout,'');assert.match(r.stderr,new RegExp('^'+category));
 }
 console.log('RT_CLOSED_KERNEL_VERIFIED '+good.length+' native kernels; '+(bad.length+3)+' artifact-free denials; deadline/WCET/prefault NOT_CERTIFIED');
}finally{rmSync(work,{recursive:true,force:true});}
