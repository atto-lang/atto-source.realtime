import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const bytes=readFileSync(new URL('../contracts/bang-keyword-whitespace-v1.json',import.meta.url));
const contract=JSON.parse(bytes);
const expectedBlob='09bd72682424d6669134e3ee126cf9a2d8f08da1';
// Reference data gate only. Neither a host regex nor this fixture enables a compiler.
test('exact shared separator target has no backend execution claim',()=>{
  const hash=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  assert.equal(hash,expectedBlob);
  assert.equal(contract.status,'LEXICAL_TARGET_ONLY_NOT_BACKEND_EXECUTED');
  assert.equal(contract.rule,'E_BANG_KEYWORD_WHITESPACE');
  assert.equal(contract.keywords.length,16);
  assert.equal(contract.cases.length,176);
  assert.equal(new Set(contract.cases.map(c=>c.id)).size,176);
  assert.equal(contract.backends.length,11);
  assert.ok(contract.backends.includes('atto'));
  assert.ok(contract.backends.includes('realtime'));
  for(const keyword of contract.keywords){
    const rows=contract.cases.filter(c=>c.id.startsWith(keyword.replaceAll('!','-bang')+'-') &&
      (keyword!=='copy!' || !c.source.startsWith('copy!!')));
    assert.equal(rows.length,11,keyword);
    assert.equal(rows.filter(c=>c.expect==='SEPARATOR_OK').length,6,keyword);
    assert.equal(rows.filter(c=>c.expect===contract.rule).length,5,keyword);
    for(const row of rows){
      assert.ok(row.source.startsWith(keyword),row.id);
      const ascii=/[ \t\r\n\v\f]/.test(row.source[keyword.length]??'');
      assert.equal(row.expect,ascii?'SEPARATOR_OK':contract.rule,row.id);
    }
  }
});
