/* V149 招募价格：广播站各职业与流浪者金币消耗均下调 20 */
const { setup, assert } = require('./_helper.js');
const { DATA } = setup();

const expect = { civilian:80, soldier:230, doctor:180, nurse:160, scout:180, brawler:180, hunter:180,
  chef:130, scientist:200, musician:160, explorer:230, thief:240, gambler:200 };

Object.entries(expect).forEach(([id,p])=>{
  const C = DATA.CLASSES[id];
  assert(C && C.price===p, `${id} 招募价下调 20 → ${p}💰`);
});
assert(DATA.VISITOR.recruitCost.gold===100 && DATA.VISITOR.recruitCost.food===20, '流浪者招募 100💰+20🍞');
const low = Object.entries(DATA.CLASSES).filter(([k,c])=>c.price<50);
assert(low.length===0, '所有职业价格保持合理（≥50）');

console.log('--- done ---');
process.exit(0);
