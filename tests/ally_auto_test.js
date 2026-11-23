/* V219 附验：AI 自动操作玩家角色（endPlayerTurn）不移动——原地攻击或休息（休息=手动休息按钮效果），跨回合正常重置 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkBattle(phase) {
  const b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:phase||'player', weather:'sunny', stats:{}, log:[], logEl:null,
    loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, fire:{}, over:false,
    subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null, multiTargets:null };
  Battle.b = b;
  return b;
}
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

(async () => {
  // 走廊地形：只留第 0 行通行
  const corridor = b => { for (let r=1;r<Battle.ROWS;r++) for (let c=0;c<Battle.COLS;c++) b.terrain[r][c]='water'; };

  // ===== T1 够不着 → 零移动 + 原地休息 =====
  let b = mkBattle();
  corridor(b);
  const a1 = Battle.mkAlly(Game.createChar('soldier','自动一',false), 0, 0);
  a1.move = 2; a1.range = 1;
  const z1 = Battle.mkZombie('walker', 0, 9, 1);
  b.units.push(a1, z1);
  startSampling(a1);
  await Battle.aiAct(a1, b.units.filter(x=>x.side==='enemy'&&x.hp>0));
  assert(sampleMoves === 0, `T1a 不追击零移动（实际 ${sampleMoves} 次）`);
  assert(a1.col === 0, `T1b 位置不变（${a1.row},${a1.col}）`);
  assert(a1.isDefending === true, 'T1c 原地休息兜底（恢复4体力+减伤）');
  assert(a1.hasMoved === true && a1.hasAttacked === true, 'T1d 行动标记落位（下回合正确重置）');

  // ===== T2 射程内有敌人 → 原地攻击，零移动 =====
  b = mkBattle();
  corridor(b);
  const a2 = Battle.mkAlly(Game.createChar('soldier','攻击二',false), 0, 0);
  a2.move = 2; a2.range = 1;
  const z2 = Battle.mkZombie('walker', 0, 1, 1);
  b.units.push(a2, z2);
  startSampling(a2);
  await Battle.aiAct(a2, b.units.filter(x=>x.side==='enemy'&&x.hp>0));
  assert(sampleMoves === 0, `T2a 原地攻击零移动（实际 ${sampleMoves} 次）`);
  assert(z2.hp < z2.maxHp, `T2b 原地普攻结算（敌人剩余 ${z2.hp}）`);
  assert(a2.hasAttacked === true, 'T2c 行动标记落位');

  // ===== T3 已手动移动过的角色：自动行动仍零移动，够不着就休息 =====
  b = mkBattle();
  corridor(b);
  const a3 = Battle.mkAlly(Game.createChar('soldier','手动三',false), 0, 0);
  a3.move = 2; a3.range = 1; a3.hasMoved = true;   // 玩家已走位、未攻击
  const z3 = Battle.mkZombie('walker', 0, 6, 1);
  b.units.push(a3, z3);
  startSampling(a3);
  await Battle.aiAct(a3, b.units.filter(x=>x.side==='enemy'&&x.hp>0));
  assert(sampleMoves === 0, `T3a 已手动移动 → 零移动（实际 ${sampleMoves} 次）`);
  assert(a3.col === 0, `T3b 位置不变（${a3.row},${a3.col}）`);
  assert(a3.isDefending === true, 'T3c 打不着 → 原地休息');
  sampled = null;

  // ===== T4 多回合稳定：够不着时每回合都零移动+休息，不再推进 =====
  b = mkBattle();
  corridor(b);
  const a4 = Battle.mkAlly(Game.createChar('soldier','连续四',false), 0, 0);
  a4.move = 2; a4.range = 1;
  const z4 = Battle.mkZombie('walker', 0, 7, 1); z4.move = 0;   // 靶子不动
  b.units.push(a4, z4);
  for (let round=1; round<=3; round++) {
    Battle.newRoundReset(a4);
    startSampling(a4);
    await Battle.aiAct(a4, b.units.filter(x=>x.side==='enemy'&&x.hp>0));
    const mv = sampleMoves;
    sampled = null;
    assert(mv === 0, `T4 第${round}回合零移动（实际 ${mv} 次）`);
    assert(a4.col === 0, `T4 第${round}回合位置不变`);
    assert(a4.isDefending === true, `T4 第${round}回合原地休息`);
  }

  // ===== T5 endPlayerTurn 集成：未行动我方原地休息 + 丧尸行动 + 回合流转 =====
  b = mkBattle('player');
  corridor(b);
  const a5 = Battle.mkAlly(Game.createChar('soldier','集成五',false), 0, 0);
  a5.move = 2; a5.range = 1;
  const z5 = Battle.mkZombie('walker', 0, 9, 1);
  b.units.push(a5, z5);
  startSampling(a5);
  await Battle.endPlayerTurn();
  assert(sampleMoves === 0, `T5a 整个回合流转中我方零移动（实际 ${sampleMoves} 次）`);
  assert(a5.col === 0, `T5b 我方位置不变（${a5.row},${a5.col}）`);
  assert(z5.col > 0, `T5c 丧尸本回合也行动过（${z5.row},${z5.col}）`);
  assert(b.turn === 2 && b.phase === 'player', `T5d 回合流转正常（turn=${b.turn} phase=${b.phase}）`);
  assert(a5.hasMoved === false && a5.hasAttacked === false, 'T5e 新回合行动标记已重置');
  sampled = null;

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
