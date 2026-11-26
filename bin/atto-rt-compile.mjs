import {openSync,closeSync,fstatSync,readSync,writeFileSync,constants as flags} from 'node:fs';
import {TextDecoder} from 'node:util';
import {compileStrictClosedScalar} from '../src/strict_closed_scalar.mjs';
function readBounded(path){
 const fd=openSync(path,flags.O_RDONLY|flags.O_NOFOLLOW|flags.O_NONBLOCK);
 try{
  const s=fstatSync(fd);if(!s.isFile()||s.size>16384)throw Error('RT_SOURCE_LIMIT: regular bounded source required');
  const b=Buffer.alloc(16385);let n=0;while(n<b.length){const k=readSync(fd,b,n,b.length-n,n);if(!k)break;n+=k;}
  if(n>16384)throw Error('RT_SOURCE_LIMIT: source grew beyond budget');
  return new TextDecoder('utf8',{fatal:true}).decode(b.subarray(0,n));
 }finally{closeSync(fd);}
}
const args=process.argv.slice(2);
if(args.length!==3||args[0]!=='--verify=strict'){console.error('usage: node bin/atto-rt-compile.mjs --verify=strict INPUT.atto OUTPUT.c');process.exitCode=2;}
else try{
 const {c}=compileStrictClosedScalar(readBounded(args[1]));writeFileSync(args[2],c,{flag:'wx'});
}catch(e){console.error(String(e.message));process.exitCode=1;}
