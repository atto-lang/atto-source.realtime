// Bounded, closed signed-i64 source -> constant native C entry.
// No allocation, runtime interpreter, imports, dynamic dispatch or loop lowering.
// This does NOT certify WCET, a scheduler, or any hard-real-time target.
const MIN=-(1n<<63n),MAX=(1n<<63n)-1n;
const SOURCE_CAP=16384,TOKEN_CAP=1024,NODE_CAP=128,DEPTH_CAP=32;
function deny(code,detail){const e=new Error(code+': '+detail);e.code=code;throw e;}
const unsupported=detail=>deny('E_VERIFY_UNSUPPORTED',detail);
function lex(source){
 if(typeof source!=='string'||Buffer.byteLength(source,'utf8')>SOURCE_CAP)deny('RT_SOURCE_LIMIT','source byte budget');
 const tokens=[];const re=/\s+|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|->|>=|<=|[(){};=:+*\/-]/gy;
 let i=0;while(i<source.length){
  re.lastIndex=i;const m=re.exec(source);if(!m)unsupported('unadmitted token at '+i);
  i=re.lastIndex;if(!/^\s+$/.test(m[0]))tokens.push(m[0]);
  if(tokens.length>TOKEN_CAP)deny('RT_TOKEN_LIMIT','token budget');
 }
 tokens.push('<eof>');return tokens;
}
export function compileStrictClosedScalar(source){
 const ts=lex(source);let i=0,nodes=0;
 const peek=()=>ts[i],take=()=>ts[i++],eat=v=>peek()===v?(i++,true):false;
 const expect=v=>{if(!eat(v))unsupported('expected '+v);};
 const name=()=>{const v=take();if(!/^[A-Z][A-Za-z_0-9]*$/.test(v??''))unsupported('nominal identifier');return v;};
 const number=(negative=false)=>{const t=take();if(!/^(0|[1-9][0-9]{0,18})$/.test(t??''))unsupported('decimal i64 literal');const n=BigInt(t)*(negative?-1n:1n);if(n<MIN||n>MAX)deny('E_VERIFY_UNPROVEN','literal outside i64');return n;};
 const bound=()=>number(eat('-'));
 const dimensions=new Set(),units=new Map(),types=new Map();
 const unique=n=>{if(dimensions.has(n)||units.has(n)||types.has(n))deny('E_UNIT_DUPLICATE','duplicate declaration');};
 while(eat('define')){
  if(eat('dimension')){const n=name();unique(n);if(dimensions.size>=8)deny('RT_TOKEN_LIMIT','dimension budget');dimensions.add(n);}
  else if(eat('unit')){const n=name();unique(n);expect(':');const d=name();if(!dimensions.has(d)||[...units.values()].includes(d))unsupported('base unit declaration');units.set(n,d);}
  else unsupported('only dimension and base unit declarations');
  expect(';');
 }
 while(eat('type')){
  const n=name();unique(n);if(types.size>=32)deny('RT_TOKEN_LIMIT','refinement budget');expect('=');expect('int');expect('where');expect('self');expect('>=');const lo=bound();expect('and');expect('self');expect('<=');const hi=bound();expect(';');
  if(lo>hi)deny('E_REFINEMENT_BINDING','empty interval');types.set(n,[lo,hi]);
 }
 if(!dimensions.size&&!types.size)unsupported('strict source requires verified declarations');
 expect('pub');expect('fnc');expect('main');expect('(');expect(')');expect('->');expect('int');expect('{');expect('return');
 const checked=n=>{if(n<MIN||n>MAX)deny('E_VERIFY_UNPROVEN','signed overflow');return n;};
 function atom(depth){
  if(depth>DEPTH_CAP||++nodes>NODE_CAP)deny('RT_PROOF_LIMIT','expression budget');
  if(eat('(')){const v=expr(0,depth+1);expect(')');return v;}
  if(eat('-')){
   if(peek()==='9223372036854775808')return number(true);
   return checked(-atom(depth+1));
  }
  return number();
 }
 function expr(min,depth){
  if(depth>DEPTH_CAP)deny('RT_PROOF_LIMIT','expression depth');
  let a=atom(depth+1);
  for(;;){
   const op=peek(),bp=op==='+'||op==='-'?1:op==='*'||op==='/'?2:0;
   if(!bp||bp<min)break;
   take();if(++nodes>NODE_CAP)deny('RT_PROOF_LIMIT','expression budget');const b=expr(bp+1,depth+1);
   if(op==='/'&&b===0n)deny('E_VERIFY_UNPROVEN','zero divisor');
   a=checked(op==='+'?a+b:op==='-'?a-b:op==='*'?a*b:a/b);
  }
  if(min===0)while(eat('as')){
   if(++nodes>NODE_CAP)deny('RT_PROOF_LIMIT','cast budget');
   const n=name(),r=types.get(n);if(!r)unsupported('only declared scalar refinement casts');
   if(a<r[0]||a>r[1])deny('E_VERIFY_UNPROVEN','refinement cast');
  }
  return a;
 }
 const result=expr(0,0);expect(';');expect('}');expect('<eof>');
 const literal=result===MIN?'INT64_MIN':result<0n?'(-INT64_C('+(-result)+'))':'INT64_C('+result+')';
 const c='#include <stdint.h>\nint64_t atto_rt_entry(void) { return '+literal+'; }\n';
 return Object.freeze({c,profile:'rt-closed-scalar-v0',value:result.toString(),proofNodes:nodes,wcetCertified:false});
}
