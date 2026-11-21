/* V167 修复丧尸同一回合二次移动：追击后原地复检（stayOnly）必须真正原地；追击后不再落入第二次追击 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkBattle() {
  const b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null,
    loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, fire:{}, over:false,
    subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null, multiTargets:null };
  Battle.b = b;
  return b;
}
/* 通过 renderMap 采样单位落定位置：AI 评估换位不渲染，真实移动（追击/规划移动）后必渲染 */
let sampled = null, sampleMoves = 0;
const origRenderMap = Battle.renderMap.bind(Battle);
Battle.renderMap = (...a) => {
  const r = origRenderMap(...a);
  if (sampled) {
    const pos = sampled.u.row+','+sampled.u.col;
    if (pos !== sampled.last) { sampleMoves++; sampled.last = pos; }
  }
  return r;
};
const startSampling = u => { sampled = { u, last:u.row+','+u.col }; sampleMoves = 0; };
const endSampling = () => { sampled = null; };

(async () => {
  // ===== T1 走廊复现：犬(移4)距人8格，够不着 → 追击一次，复检不二次移动 =====
  let b = mkBattle();
  for (let r=1;r<Battle.ROWS;r++) for (let c=0;c<Battle.COLS;c++) b.terrain[r][c]='water';   // 只留第0行通行
  const dog = Battle.mkZombie('runner', 0, 0, 1);        // 丧尸犬：技能「凶猛撕咬」射程1、移动力4
  const victim = Battle.mkAlly(Game.createChar('soldier','诱饵',false), 0, 8);
  victim.hp = victim.maxHp = 500;
  b.units.push(dog, victim);
  startSampling(dog);
  await Battle.zombieAct(dog);
  assert(sampleMoves <= 1, `T1a 同一回合最多移动一次（实际渲染落定移动 ${sampleMoves} 次）`);
  assert(dog.col === 4, `T1b 追击一步到位：停在距人 4 格处（${dog.row},${dog.col}）`);
  assert(Math.abs(dog.row-0)+Math.abs(dog.col-8) > 1, 'T1c 复检不追击：未贴脸二次移动');
  endSampling();

  // ===== T2 已在攻击位：原地咬人，零移动 =====
  b = mkBattle();
  const dog2 = Battle.mkZombie('runner', 0, 7, 1);
  const v2 = Battle.mkAlly(Game.createChar('soldier','诱饵二',false), 0, 8);
  v2.hp = v2.maxHp = 500;
  b.units.push(dog2, v2);
  startSampling(dog2);
  await Battle.zombieAct(dog2);
  assert(sampleMoves === 0, `T2a 原地撕咬不移动（实际 ${sampleMoves} 次）`);
  assert(v2.hp < v2.maxHp, 'T2b 凶猛撕咬正常结算伤害');
  endSampling();

  // ===== T3 无技能丧尸：追击一次后够不着就停（不二次追击）=====
  b = mkBattle();
  for (let r=1;r<Battle.ROWS;r++) for (let c=0;c<Battle.COLS;c++) b.terrain[r][c]='water';
  const wk = Battle.mkZombie('walker', 0, 0, 1);         // 游荡者：无技能、移动力2
  const far = Battle.mkAlly(Game.createChar('soldier','远人',false), 0, 9);
  far.hp = far.maxHp = 500;
  b.units.push(wk, far);
  startSampling(wk);
  await Battle.zombieAct(wk);
  assert(sampleMoves === 1, `T3a 无技能丧尸追击仅一次（实际 ${sampleMoves} 次）`);
  assert(wk.col === 2, `T3b 停在移动力 2 的位置（${wk.row},${wk.col}）`);
  endSampling();

  // ===== T4 能打到时照常主动贴脸攻击（一次移动 + 攻击）=====
  b = mkBattle();
  const dog3 = Battle.mkZombie('runner', 0, 3, 1);
  const near = Battle.mkAlly(Game.createChar('soldier','近人',false), 0, 6);   // 距离3 ≤ 移4+射程1
  near.hp = near.maxHp = 500;
  b.units.push(dog3, near);
  startSampling(dog3);
  await Battle.zombieAct(dog3);
  assert(sampleMoves === 1, `T4a 规划移动仅一次（实际 ${sampleMoves} 次）`);
  assert(near.hp < near.maxHp, 'T4b 移动到位后撕咬结算');
  assert(Math.abs(dog3.row-near.row)+Math.abs(dog3.col-near.col) <= 1, 'T4c 落位在撕咬射程内');
  endSampling();

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
