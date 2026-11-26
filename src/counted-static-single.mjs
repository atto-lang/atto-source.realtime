// Static single-channel counted-ready source frontend. No guest payload
// evaluation during compilation; only closed FIFO topology is scalarized.
const fail=m=>{throw Object.assign(new Error('E_COUNTED_STATIC_SINGLE: '+m),{code:'E_COUNTED_STATIC_SINGLE'});};
export function parseCountedSingle(source){
 if(typeof source!=='string'||source.length>16384||/[^\x20-\x7e\n\r\t]/.test(source))fail('bounded ASCII source required');
 const tokens=[],re=/\s+|\/\/[^\r\n]*|[A-Za-z_][A-Za-z_0-9]*|[0-9]+|->|==|!=|<=|>=|&&|\|\||[(){}\[\]:;,.+*<>=-]/gy;
 let pos=0;
 while(pos<source.length){re.lastIndex=pos;const m=re.exec(source);if(!m)fail('unadmitted token');pos=re.lastIndex;if(!/^\s|^\/\//.test(m[0]))tokens.push(m[0]);if(tokens.length>2048)fail('token budget');}
 tokens.push('<eof>');let i=0,depth=0,nodes=0,channel=null,cap=0,sites=0,pending=null;
 const slots=new Map(),queue=[],locals=[],branches=[];
 const peek=()=>tokens[i],eat=x=>peek()===x?(i++,true):false,need=x=>{if(!eat(x))fail('expected '+x);};
 const reserved=new Set('pub suspends fnc main int bool val let const Channel Future Array new writech readch select nb await when fair first random default over end return if then fi true false'.split(' '));
 function name(){const x=peek();if(!/^[A-Za-z_][A-Za-z0-9_]*$/.test(x??'')||reserved.has(x))fail('lexical name');i++;return x;}
 const small=max=>{const x=peek();if(!/^[0-9]{1,19}$/.test(x??'')||BigInt(x)>BigInt(max))fail('literal bound');i++;return Number(x);};
 const lit=n=>({k:'lit',n:String(n),t:'int'}),ref=n=>({k:'ref',n,t:'int'});
 const local=e=>{if(locals.length>=64)fail('local budget');locals.push(e);return ref(locals.length-1);};
 const checked=(e,t)=>{if(e.t!==t)fail('expected '+t);return e;};
 const prec=x=>({'||':1,'&&':2,'==':3,'!=':3,'<':4,'>':4,'<=':4,'>=':4,'+':5,'-':5,'*':6}[x]??0);
 function expr(min=1,binder=null,terminal=false){
  if(++depth>32||++nodes>1024)fail('expression budget');
  let a;
  if(eat('(')){a=expr(1,binder,terminal);need(')');}
  else if(eat('-'))a={k:'neg',a:checked(expr(7,binder,terminal),'int'),t:'int'};
  else if(/^[0-9]+$/.test(peek()??'')){const x=peek();if(x.length>19||BigInt(x)>9223372036854775807n)fail('i64 literal');i++;a=lit(BigInt(x));}
  else if(binder!==null){if(name()!==binder)fail('projection binder only');a={k:'binder',t:'int'};}
  else if(eat('readch')){if(!terminal||pending||name()!==channel||queue.length===0)fail('terminal ready read required');a=queue.shift();}
  else {const n=name(),s=slots.get(n);if(s?.k!=='array')fail('lexical array required');if(eat('[')){const j=small(15);need(']');if(j>=s.a.length)fail('array bound');a=s.a[j];}else{need('.');need('size');a=lit(s.a.length);}}
  while(prec(peek())>=min){const op=peek();i++;if(terminal&&['&&','||'].includes(op))fail('terminal short circuit unsupported');const b=expr(prec(op)+1,binder,terminal);const boolean=['&&','||'].includes(op);const arithmetic=['+','-','*'].includes(op);a={k:'bin',op,a:checked(a,boolean?'bool':'int'),b:checked(b,boolean?'bool':'int'),t:arithmetic?'int':'bool'};}
  depth--;return a;
 }
 function project(e,v){if(e.k==='binder')return v;if(e.k==='lit')return e;if(e.k==='neg')return {...e,a:project(e.a,v)};if(e.k==='bin'&&e.t==='int')return {...e,a:project(e.a,v),b:project(e.b,v)};fail('pure i64 projection');}
 function plan(){
  if(pending||!channel)fail('await outstanding plan first');if(eat('<')){need('int');need('>');}need('(');const n=small(16);need(')');if(!eat('fair'))eat('first');
  const over=eat('over');if(!over)need('{');need('when');need('readch');if(name()!==channel)fail('one local channel only');need(':');need('int');const binder=name();need('->');need('{');need('return');const projection=checked(expr(1,binder),'int');need(';');need('}');need(over?'end':'}');
  sites++;return {n,projection};
 }
 function drive(p){if(queue.length<p.n)fail('statically would suspend');return Array.from({length:p.n},()=>local(project(p.projection,queue.shift())));}
 function arrayType(){need('Array');const bracket=eat('[');if(!bracket)need('<');need('int');need(bracket?']':'>');}
 function bind(){
  if(eat('Channel')){
   need('<');need('int');need('>');const n=name();if(channel||slots.has(n))fail('single channel');need('=');need('Channel');need('.');need('new');need('<');need('int');need('>');need('(');cap=small(16);if(!cap)fail('positive capacity');need(')');channel=n;slots.set(n,{k:'channel'});
  }else if(eat('Future')){
   need('<');arrayType();need('>');const n=name();if(slots.has(n))fail('duplicate binding');need('=');eat('nb');need('select');const p=plan();pending=n;slots.set(n,{k:'pending',p});
  }else{
   arrayType();const n=name();if(slots.has(n))fail('duplicate binding');need('=');need('await');const nb=eat('nb');let p;
   if(eat('select'))p=plan();else{if(nb)fail('nb requires select');const h=name();if(pending!==h)fail('expected outstanding handle');p=slots.get(h).p;slots.set(h,{k:'consumed'});pending=null;}
   slots.set(n,{k:'array',a:drive(p)});
  }need(';');
 }
 eat('pub');need('suspends');need('fnc');need('main');need('(');need(')');need(':');need('int');need('{');
 let statements=0;
 while(peek()!=='return'){
  if(++statements>64)fail('statement budget');
  if(eat('val')){if(branches.length)fail('terminal branches only');bind();}
  else if(eat('writech')){if(pending||branches.length||name()!==channel||queue.length>=cap)fail('ready local write required');need(',');queue.push(local(checked(expr(),'int')));need(';');}
  else if(eat('if')){if(pending)fail('await pending first');const c=checked(expr(),'bool');need('then');need('return');const saved=queue.slice();const v=checked(expr(1,null,true),'int');queue.splice(0,queue.length,...saved);need(';');need('fi');branches.push({c,v});}
  else fail('unsupported statement');
 }
 need('return');const result=checked(expr(1,null,true),'int');need(';');need('}');need('<eof>');if(pending||!sites)fail('one closed counted main required');
 return {locals,branches,result};
}
// A small typed code generator; every arithmetic intermediate is evaluated
// in source order, with explicit failure propagation and lazy booleans.
export function emitCountedSingle(source,target){
 const p=parseCountedSingle(source);let next=0;const decl=[],body=[];
 const isC=target==='c';if(!isC&&target!=='sv')fail('unknown target');
 function temp(){const n='t'+next++;decl.push(isC?'int64_t '+n+' = 0;':'logic signed [63:0] '+n+';');return n;}
 const literal=n=>isC?'INT64_C('+n+')':"64'sd"+n;
 function emit(e,out){
  if(e.k==='lit')return literal(e.n);
  if(e.k==='ref')return 'v'+e.n;
  const a=emit(e.a,out),r=temp();
  if(e.k==='bin'&&['&&','||'].includes(e.op)){
   const cond=e.op==='&&'?a:'!'+a;
   out.push('if ('+cond+') '+(isC?'{':'begin'));
   const b=emit(e.b,out);out.push(r+' = '+b+';'+(isC?' } else {':' end else begin'),r+' = '+(e.op==='&&'?'0':'1')+';'+(isC?' }':' end'));return r;
  }
  const b=e.k==='neg'?null:emit(e.b,out);
  const op=e.k==='neg'?'-':e.op;
  if(e.k==='neg'||['+','-','*'].includes(op)){
   if(isC){const builtin=op==='+'?'add':op==='-'?'sub':'mul';out.push('if (__builtin_'+builtin+'_overflow('+ (e.k==='neg'?'INT64_C(0), '+a:a+', '+b)+', &'+r+')) return 1;');}
   else{
    const extend=x=>"$signed({{64{"+x+"[63]}},"+x+"})";
    // Materialize literals first so indexing and sign extension are legal.
    const x=temp(),y=temp();out.push(x+' = '+(e.k==='neg'?"64'sd0":a)+';',y+' = '+(e.k==='neg'?a:b)+';');
    out.push('wide = '+extend(x)+' '+op+' '+extend(y)+';','if (wide > 128\'sd9223372036854775807 || wide < -128\'sd9223372036854775808) status = 1;',''+r+' = wide[63:0];');
   }
  }else out.push(r+' = ('+a+' '+op+' '+b+');');
  return r;
 }
 for(const [i,e] of p.locals.entries()){decl.push(isC?'int64_t v'+i+' = 0;':'logic signed [63:0] v'+i+';');const x=emit(e,body);body.push('v'+i+' = '+x+';');}
 if(isC){
  for(const {c,v} of p.branches){const x=emit(c,body);body.push('if ('+x+') {');const y=emit(v,body);body.push('*result = '+y+'; return 0; }');}
  const x=emit(p.result,body);body.push('*result = '+x+'; return 0;');
  return '#include <stdint.h>\nint atto_counted_entry(int64_t *result) {\nif (!result) return 2;\n'+decl.join('\n')+'\n'+body.join('\n')+'\n}\n';
 }
 body.push('done = 0;');
 for(const {c,v} of p.branches){body.push('if (!done && status == 0) begin');const x=emit(c,body);body.push('if ('+x+') begin');const y=emit(v,body);body.push('result = '+y+'; done = 1; end end');}
 body.push('if (!done && status == 0) begin');const x=emit(p.result,body);body.push('result = '+x+'; end','if (status != 0) result = 0;');
 const resets=decl.map(d=>d.match(/ (\w+);$/)[1]+' = 0;');
 return 'module atto_counted(input wire enable, output reg signed [63:0] result, output reg [1:0] status);\n'+decl.join('\n')+'\nlogic signed [127:0] wide; logic done;\nalways @* begin\nresult = 0; status = 0; wide = 0; done = 0;\n'+resets.join('\n')+'\nif (enable) begin\n'+body.join('\n')+'\nend end\nendmodule\n';
}
