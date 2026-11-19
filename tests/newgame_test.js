/* V71 新游戏初始 3 角色：数量、职业随机去重、名字去重 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();

let allOk = true;
const seenCombos = new Set();
for (let i=0; i<100; i++) {
  const g = Game.newGame();
  const cs = g.chars;
  // 1) 数量
  if (cs.length!==3) { allOk=false; console.log(`FAIL T1 第${i}轮人数=${cs.length}`); break; }
  // 2) 职业合法且互不重复
  const clss = cs.map(c=>c.cls);
  if (clss.some(k=>!DATA.CLASSES[k]) || new Set(clss).size!==3) { allOk=false; console.log(`FAIL T2 第${i}轮职业异常=${clss.join(',')}`); break; }
  seenCombos.add(clss.slice().sort().join('+'));
  // 3) 名字互不重复且来自名字池
  const names = cs.map(c=>c.name);
  if (new Set(names).size!==3 || names.some(n=>!DATA.NAMES.includes(n))) { allOk=false; console.log(`FAIL T3 第${i}轮名字异常=${names.join(',')}`); break; }
  // 4) 属性按职业初始化、状态健康
  if (cs.some(c=>c.hp<=0 || c.stamina<=0 || c.injured || c.dead)) { allOk=false; console.log(`FAIL T4 第${i}轮角色状态异常`); break; }
}
assert(allOk, 'T1-T4 100 轮：3 人 / 职业随机去重 / 名字去重 / 状态健康');
assert(seenCombos.size>=10, `T5 职业组合有多样性（100 轮出现 ${seenCombos.size} 种组合）`);

// T6 开局文案（源码检查）
assert(html.includes('你带着三名幸存者在城中落脚了'), 'T6 开局 toast 文案为三名幸存者');

console.log('--- done ---');
process.exit(allOk ? 0 : 1);
