/* V167 附验：AI 自动操作玩家角色（endPlayerTurn 自动追击）每回合最多移动一次，且跨回合正常恢复 */
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

  // ===== T1 我方自动追击：够不着 → 恰好一次移动 + 原地休息兜底 =====
  let b = mkBattle();
  corridor(b);
  const a1 = Battle.mkAlly(Game.createChar('soldier','自动一',false), 0, 0);
  a1.move = 2; a1.range = 1;
  const z1 = Battle.mkZombie('walker', 0, 9, 1);
  b.units.push(a1, z1);
  startSampling(a1);
  await Battle.aiAct(a1, b.units.filter(x=>x.side==='enemy'&&x.hp>0));
  assert(sampleMoves === 1, `T1a 自动追击仅移动一次（实际 ${sampleMoves} 次）`);
  assert(a1.col === 2, `T1b 停在移动力 2 处（${a1.row},${a1.col}）`);
  assert(a1.hasMoved === true && a1.hasAttacked === true, 'T1c 行动标记落位（下回合正确重置）');
  assert(a1.isDefending === true, 'T1d 够不着时原地休息兜底（不二次移动）');

  // ===== T2 玩家已手动移动过的角色：自动代打不再移动 =====
  b = mkBattle();
  corridor(b);
  const a2 = Battle.mkAlly(Game.createChar('soldier','手动二',false), 0, 0);
  a2.move = 2; a2.range = 1; a2.hasMoved = true;   // 玩家已走位、未攻击
  const z2 = Battle.mkZombie('walker', 0, 6, 1);
  b.units.push(a2, z2);
  startSampling(a2);
  await Battle.aiAct(a2, b.units.filter(x=>x.side==='enemy'&&x.hp>0));
  assert(sampleMoves === 0, `T2a 已手动移动 → 代打零移动（实际 ${sampleMoves} 次）`);
  assert(a2.col === 0, `T2b 位置不变（${a2.row},${a2.col}）`);
  assert(a2.isDefending === true, 'T2c 打不着 → 原地休息');
  sampled = null;

  // ===== T3 连续多回合：每回合移动一次，贴脸后转为攻击 =====
  b = mkBattle();
  corridor(b);
  const a3 = Battle.mkAlly(Game.createChar('soldier','连续三',false), 0, 0);
  a3.move = 2; a3.range = 1;
  const z3 = Battle.mkZombie('walker', 0, 7, 1); z3.move = 0;   // 靶子不动
  b.units.push(a3, z3);
  for (let round=1; round<=5; round++) {
    Battle.newRoundReset(a3);
    startSampling(a3);
    await Battle.aiAct(a3, b.units.filter(x=>x.side==='enemy'&&x.hp>0));
    const mv = sampleMoves;
    sampled = null;
    if (round <= 3) {
      assert(mv === 1, `T3 第${round}回合追击恰一次（实际 ${mv} 次）`);
    } else {
      assert(mv === 0, `T3 第${round}回合贴脸后零移动（实际 ${mv} 次）`);
      assert(z3.hp < z3.maxHp, `T3 第${round}回合近身普攻结算（敌人剩余 ${z3.hp}）`);
    }
  }
  assert(a3.col === 6, `T3 三回合累计走 6 格（${a3.row},${a3.col}）`);

  // ===== T4 endPlayerTurn 集成：未行动我方自动行动一次 + 丧尸行动一次 =====
  b = mkBattle('player');
  corridor(b);
  const a4 = Battle.mkAlly(Game.createChar('soldier','集成四',false), 0, 0);
  a4.move = 2; a4.range = 1;
  const z4 = Battle.mkZombie('walker', 0, 9, 1);
  b.units.push(a4, z4);
  startSampling(a4);
  await Battle.endPlayerTurn();
  assert(sampleMoves === 1, `T4a 整个回合流转中我方仅移动一次（实际 ${sampleMoves} 次）`);
  assert(a4.col === 2, `T4b 我方停在移动力尽头（${a4.row},${a4.col}）`);
  assert(z4.col > 0, `T4c 丧尸本回合也行动过（${z4.row},${z4.col}）`);
  assert(b.turn === 2 && b.phase === 'player', `T4d 回合流转正常（turn=${b.turn} phase=${b.phase}）`);
  assert(a4.hasMoved === false && a4.hasAttacked === false, 'T4e 新回合行动标记已重置');
  sampled = null;

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
