import {readFileSync,writeFileSync,lstatSync} from 'node:fs';
import {compileStrictClosedScalar} from '../src/strict_closed_scalar.mjs';
const args=process.argv.slice(2);
if(args.length!==3||args[0]!=='--verify=strict'){console.error('usage: node bin/atto-rt-compile.mjs --verify=strict INPUT.atto OUTPUT.c');process.exitCode=2;}
else try{
 const stat=lstatSync(args[1]);if(!stat.isFile()||stat.size>16384)throw Error('RT_SOURCE_LIMIT: regular bounded source required');
 const {c}=compileStrictClosedScalar(readFileSync(args[1],'utf8'));writeFileSync(args[2],c,{flag:'wx'});
}catch(e){console.error(String(e.message));process.exitCode=1;}
