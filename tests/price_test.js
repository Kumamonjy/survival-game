/* V214 招募价格：除平民外各职业金币再下调 10 */
const { setup, assert } = require('./_helper.js');
const { DATA } = setup();

const expect = { civilian:60, soldier:200, doctor:150, nurse:130, scout:150, brawler:150, hunter:150,
  chef:100, scientist:170, musician:130, explorer:200, thief:210, gambler:170 };

Object.entries(expect).forEach(([id,p])=>{
  const C = DATA.CLASSES[id];
  assert(C && C.price===p, `${id} 招募价 → ${p}💰（V214 除平民外再降 10）`);
});
assert(DATA.VISITOR.recruitCost.gold===100 && DATA.VISITOR.recruitCost.food===20, '流浪者招募 100💰+20🍞');
const low = Object.entries(DATA.CLASSES).filter(([k,c])=>c.price<50);
assert(low.length===0, '所有职业价格保持合理（≥50）');

console.log('--- done ---');
process.exit(0);
