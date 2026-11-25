import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const c=JSON.parse(readFileSync(new URL('../contracts/bang-exception-keywords-v1/cases.json',import.meta.url)));
// Deliberately limited host reference scanner; never a compiler admission check.
function scan(source){
 const out=[];
 const tokens=source.matchAll(/"(?:\\.|[^"\\])*"|\/\/[^\n]*|\/\*[\s\S]*?\*\/|[A-Za-z_][A-Za-z0-9_]*!?|[^\s]/g);
 for(const m of tokens){if(c.canonical.includes(m[0])||c.migration.includes(m[0])) out.push(m[0]);}
 return out;
}
test('lexical design distinguishes contiguity, identifiers, comments and punctuation',()=>{
 for(const [source,want] of c.vectors) assert.deepEqual(scan(source),want,source);
});
test('staging cannot advertise compiler or guest support',()=>{
 assert.deepEqual(c.canonical,['trap!','throw!','raise!','panic!']);
 assert.equal(c.compiler_supported,false);
 assert.equal(c.guest_evidence,'NOT_EXECUTED');
 assert.equal(c.status,'BOOTSTRAP_DESIGN_ONLY');
});
