// Host structural and BigInt oracle only. No guest, AOT, WCET or RTL proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const pins = {
  "identity": "40aa48e5508c8fe24aa5ef7ebe2bde73aaad0b57",
  "byte_bounds": "3c8544bb4e8d87fe63b1284a627913aea6d91527",
  "size_math": "ae7bc1a9200e02635b0ab9d26438f10385564067",
  "u32_endian": "92297c9df0169ab63197faf74f45af39ae5b7091"
};
for(const [name,sha] of Object.entries(pins)) {
  test('canonical core exact blob: '+name,()=>{
    const bytes=readFileSync(new URL('../stdlib/core/'+name+'.atto',import.meta.url));
    const actual=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
    assert.equal(actual,sha);
    const code=bytes.toString('utf8').replace(/\/\/[^\n]*/g,'');
    assert.doesNotMatch(code,/\b(import|new|await|spawn|malloc|ffi|stdio|network|process)\b/);
  });
}
test('scalar bounds and budgets: independent exact BigInt reference vectors',()=>{
  const M=(1n<<63n)-1n;
  const edges=[-1n,0n,1n,2n,127n,128n,255n,65535n,4294967295n,M-1n,M];
  for(const a of edges) for(const b of edges) for(const limit of edges){
    const valid=a>=0n&&b>=0n&&limit>=0n;
    assert.equal(valid&&a<=limit&&b<=limit-a,valid&&a+b<=limit);
    assert.equal(valid&&(a===0n||b===0n||a<=limit/b),valid&&a*b<=limit);
    assert.equal(valid&&b<=limit&&a<=limit-b,valid&&a+b<=limit);
  }
});
test('byte lane reference: explicit low-eight masks and u32 extremes',()=>{
  const edges=[-1n,0n,1n,127n,128n,255n,256n,4294967295n,(1n<<63n)-1n];
  for(const a of edges) for(const b of edges) for(const c of edges) for(const d of edges) {
    const le=(a&255n)|((b&255n)<<8n)|((c&255n)<<16n)|((d&255n)<<24n);
    const be=((a&255n)<<24n)|((b&255n)<<16n)|((c&255n)<<8n)|(d&255n);
    for(let i=0;i<4;i++){
      assert.equal((le>>BigInt(i*8))&255n,[a,b,c,d][i]&255n);
      assert.equal((be>>BigInt(i*8))&255n,[d,c,b,a][i]&255n);
    }
  }
});
