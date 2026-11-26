// Restricted closed, pure Bool profile -> native C. No host evaluation of
// guest truth values, general array storage, effects, or WCET certification.
const SOURCE_CAP=16384, TOKEN_CAP=1024, NODE_CAP=512, DEPTH_CAP=32, ARITY_CAP=32;
const deny=detail=>{throw Error('E_RT_BOOL_UNSUPPORTED: '+detail);};
const limit=detail=>{throw Error('E_RT_BOOL_LIMIT: '+detail);};
const gates=new Set(['And','Or','Xor']);
function lex(source){
 if(typeof source!=='string'||Buffer.byteLength(source,'utf8')>SOURCE_CAP)limit('source');
 if(/[^\x09\x0a\x0d\x20-\x7e]/.test(source))deny('ASCII source only');
 const tokens=[];const re=/[ \t\r\n]+|\/\/[^\r\n]*|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|->|&&|\|\||[!(){}\[\],;:=\-]/gy;
 let i=0;while(i<source.length){
  re.lastIndex=i;const m=re.exec(source);if(!m)deny('token at '+i);
  i=re.lastIndex;if(!/^[ \t\r\n]|^\/\//.test(m[0]))tokens.push(m[0]);
  if(tokens.length>TOKEN_CAP)limit('tokens');
 }
 tokens.push('<eof>');return tokens;
}
export function compileClosedBoolean(source){
 const tokens=lex(source);let at=0,nodes=0;
 const peek=()=>tokens[at],eat=v=>peek()===v?(at++,true):false;
 const expect=v=>{if(!eat(v))deny('expected '+v);};
 const bump=depth=>{if(depth>DEPTH_CAP||++nodes>NODE_CAP)limit('expression');};
 const bindings=new Map(),lines=[];
 const reserved=new Set('pub fnc main int i64 bool boolean void float string val let const mut true false if then fi do else return And Or Xor and or xor not eq neq as is type define declare class enum actor supervisor state task await suspends sync async throw raise panic trap defer recover try catch finally guard while for loop break continue yield import namespace module routine mtd private external abstract critical where unit dimension take share copy move borrow pin drop pipe rpipe select default using use with new self this super extends implements interface trait in of stop spawn rt gen generator suspend channel receive init'.split(' '));
 const integer=()=>{
  const neg=eat('-'),word=peek();
  if(!/^(0|[1-9][0-9]{0,18})$/.test(word??''))deny('signed i64 return literal');
  at++;const n=BigInt(word)*(neg?-1n:1n);
  if(n<-(1n<<63n)||n>(1n<<63n)-1n)deny('signed i64 range');
  return n===-(1n<<63n)?'INT64_MIN':n<0n?'(-INT64_C('+(-n)+'))':'INT64_C('+n+')';
 };
 function atom(depth){
  bump(depth);
  if(eat('!'))return '(!'+atom(depth+1)+')';
  if(eat('(')){const v=expr(depth+1);expect(')');return v;}
  if(eat('true'))return '1';if(eat('false'))return '0';
  const name=peek();
  if(bindings.has(name)){at++;return bindings.get(name);}
  if(!gates.has(name))deny('expected bool operand');
  at++;expect('(');const pack=eat('['),end=pack?']':')',args=[];
  if(peek()!==end){
   do{if(args.length>=ARITY_CAP)limit('reduction arity');args.push(expr(depth+1));}while(eat(','));
  }
  expect(end);if(pack)expect(')');else if(args.length<2)deny('scalar reduction requires two operands');
  // All admitted operands are pure, total and statically bool. Count eager
  // pack/XOR inputs using bounded 0/1 addition, never host truth evaluation.
  // C may reorder pure inputs; no observable operand order or Array ABI is
  // claimed. Scalar And/Or retain C short-circuit gates.
  if(!args.length)return name==='And'?'1':'0';
  if(!pack&&name!=='Xor')return '('+args.join(name==='And'?' && ':' || ')+')';
  const sum='('+args.join(' + ')+')';
  return name==='And'?'('+sum+' == '+args.length+')':name==='Or'?'('+sum+' != 0)':'('+sum+' % 2)';
 }
 function conjunction(depth){
  let lhs=atom(depth);while(eat('&&')){bump(depth);lhs='('+lhs+' && '+atom(depth)+')';}return lhs;
 }
 function expr(depth){
  let lhs=conjunction(depth);while(eat('||')){bump(depth);lhs='('+lhs+' || '+conjunction(depth)+')';}return lhs;
 }
 expect('pub');expect('fnc');expect('main');expect('(');expect(')');
 if(!eat(':'))expect('->');expect('int');expect('{');
 while(eat('val')){
  if(bindings.size>=32)limit('bindings');
  expect('bool');const name=peek();
  if(!/^[a-z_][A-Za-z_0-9]*$/.test(name??'')||reserved.has(name)||bindings.has(name))deny('invalid bool binding');
  at++;expect('=');const value=expr(0);expect(';');
  const slot='b'+bindings.size;bindings.set(name,slot);lines.push('  const _Bool '+slot+' = '+value+';','  (void)'+slot+';');
 }
 let guards=0;
 while(eat('if')){
  if(++guards>32)limit('guards');
  const condition=expr(0);expect('then');expect('return');const value=integer();expect(';');expect('fi');
  lines.push('  if ('+condition+') return '+value+';');
 }
 expect('return');lines.push('  return '+integer()+';');expect(';');expect('}');expect('<eof>');
 return Object.freeze({c:'#include <stdint.h>\nint64_t atto_rt_entry(void) {\n'+lines.join('\n')+'\n}\n',profile:'rt-closed-pure-bool-v0',proofNodes:nodes,wcetCertified:false});
}
