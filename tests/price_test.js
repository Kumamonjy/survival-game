/* V213 招募价格：广播站各职业金币再下调 20；V213 播报免费 */
const { setup, assert } = require('./_helper.js');
const { DATA } = setup();

const expect = { civilian:60, soldier:210, doctor:160, nurse:140, scout:160, brawler:160, hunter:160,
  chef:110, scientist:180, musician:140, explorer:210, thief:220, gambler:180 };

Object.entries(expect).forEach(([id,p])=>{
  const C = DATA.CLASSES[id];
  assert(C && C.price===p, `${id} 招募价下调 20 → ${p}💰`);
});
assert(DATA.VISITOR.recruitCost.gold===100 && DATA.VISITOR.recruitCost.food===20, '流浪者招募 100💰+20🍞');
const low = Object.entries(DATA.CLASSES).filter(([k,c])=>c.price<50);
assert(low.length===0, '所有职业价格保持合理（≥50）');

console.log('--- done ---');
process.exit(0);
