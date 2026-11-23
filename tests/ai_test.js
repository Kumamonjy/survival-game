/* AI 寻路（距离场）+ 结束行动自动行动 验证 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1, s2] = g.chars;

function mkBattle(units, terrain) {
  const t = terrain || Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain'));
  Battle.b = { units, selected:null, terrain:t, mode:null, turn:1, phase:'player', weather:'sunny',
    stats:{}, log:[], logEl:null, loot:{}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  return Battle.b;
}

(async () => {
  // ===== T1 flowField =====
  mkBattle([]);
  const f1 = Battle.flowField(5, 7);
  assert(f1['5,3']===4, 'T1a 空地距离场=曼哈顿');
  // 竖墙：col5 行2~8 石头
  const wall = Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain'));
  for (let r=2;r<=8;r++) wall[r][5]='rubble';
  mkBattle([], wall);
  const f2 = Battle.flowField(5, 7);   // 目标在墙右
  assert(f2['5,3']>4, `T1b 隔墙实际距离 ${f2['5,3']} > 曼哈顿 4`);
  assert(f2['5,4']!==undefined && f2['1,5']!==undefined, 'T1c 墙两侧与绕行通道均可达');
  assert(f2['2,5']===undefined, 'T1d 石头格不可通行');

  // ===== T2 aiAct 寻路：隔墙不再卡死 =====
  const z = Battle.mkZombie('walker', 5, 3, 1);
  const a1 = Battle.mkAlly(s1, 5, 7);
  mkBattle([z, a1], wall);
  const before = f2['5,3'];
  await Battle.zombieAct(z);
  assert(z.row!==5 || z.col!==3, `T2a 丧尸绕墙移动到 (${z.row},${z.col})`);
  const after = Battle.flowField(5, 7)[z.row+','+z.col];
  assert(after < before, `T2b 实际距离缩短 ${before} → ${after}`);
  assert(!z.isDefending, 'T2c 丧尸不误触防御兜底');

  // ===== T3 aiAct 攻击选择：伤害期望最大 =====
  const z2 = Battle.mkZombie('walker', 5, 5, 1);
  const lowDef = Battle.mkAlly(s2, 5, 6); lowDef.def = 5; lowDef.hp = lowDef.maxHp;
  const highDef = Battle.mkAlly(s1, 4, 6); highDef.def = 30; highDef.hp = highDef.maxHp;
  mkBattle([z2, lowDef, highDef]);
  await Battle.zombieAct(z2);
  assert(lowDef.hp<lowDef.maxHp || lowDef.hp===0, 'T3a 攻击低防目标');
  assert(highDef.hp===highDef.maxHp, 'T3b 不打高防目标');

  // ===== T4 endPlayerTurn 自动行动（V219：原地攻击/休息，不移动） =====
  const toastHist = [];
  const origToast = UI.toast.bind(UI);
  UI.toast = m => { toastHist.push(String(m)); origToast(m); };
  const u1 = Battle.mkAlly(s1, 8, 3); u1.hasAttacked = false;
  const z3 = Battle.mkZombie('walker', 8, 9, 1); z3.hp = z3.maxHp;
  mkBattle([u1, z3]);
  await Battle.endPlayerTurn();
  assert(toastHist.some(m=>m.includes('原地攻击/休息')), 'T4a 提示原地行动');
  assert(u1.row===8 && u1.col===3, 'T4b 不追击，位置不变');
  const log4 = Battle.b.log.map(e=>e.msgs.map(m=>m.m).join('|')).join('|');
  assert(log4.includes('原地休息，恢复 4 点体力'), 'T4c 够不着 → 原地休息（日志）');
  assert(Battle.b.turn===2 && Battle.b.phase==='player', 'T4d 完整回合流转（丧尸回合后回到玩家回合）');
  assert(u1.hasAttacked===false && u1.hasMoved===false, 'T4e 新回合标记重置');

  // ===== T5 已行动全员 → 不触发自动直接丧尸回合 =====
  const histLen = toastHist.length;
  const u2 = Battle.mkAlly(s2, 3, 3); u2.hasAttacked = true;
  const z4 = Battle.mkZombie('walker', 3, 8, 1); z4.hp = z4.maxHp;
  mkBattle([u2, z4]);
  await Battle.endPlayerTurn();
  assert(!toastHist.slice(histLen).some(m=>m.includes('原地攻击/休息')), 'T5a 全员已行动不提示自动');
  assert(u2.row===3 && u2.col===3, 'T5b 已行动角色未被移动');

  // ===== T6 围死兜底：自动防御 =====
  const box = Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain'));
  [[3,2],[3,3],[3,4],[4,2],[4,4],[5,2],[5,3],[5,4]].forEach(([r,c])=>box[r][c]='rubble');
  const u3 = Battle.mkAlly(s1, 4, 3); u3.hasAttacked = false;
  const z5 = Battle.mkZombie('walker', 9, 9, 1);
  mkBattle([u3, z5], box);
  await Battle.endPlayerTurn();
  const log6 = Battle.b.log.map(e=>e.msgs.map(m=>m.m).join('|')).join('|');
  assert(log6.includes('原地休息，恢复 4 点体力'), 'T6a 被围死角色自动休息回体力（日志）');

  // ===== T7 多回合连续行动（V43 回归：丧尸第二回合不再站桩） =====
  const z6 = Battle.mkZombie('walker', 8, 3, 1);
  const a3 = Battle.mkAlly(s1, 8, 9);
  mkBattle([z6, a3]);
  const p0 = z6.row+','+z6.col;
  await Battle.zombieAct(z6);
  const moved1 = z6.row+','+z6.col !== p0 || a3.hp < a3.maxHp;
  assert(moved1, 'T7a 第一回合丧尸移动或攻击');
  const pos1 = z6.row+','+z6.col;
  await Battle.zombieAct(z6);   // 第二回合（未重置 hasMoved——修复后丧尸仍应行动）
  const pos2 = z6.row+','+z6.col;
  assert(pos2 !== pos1 || a3.hp < a3.maxHp, `T7b 第二回合丧尸继续行动（${pos1} → ${pos2}）`);
  assert(!z6.hasMoved, 'T7c 丧尸 hasMoved 不再跨回合残留');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
