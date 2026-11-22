/* V180 攻击类技能清瓦砾 + 奔袭落点通行性修复：AOE/直线技波及格清除瓦砾留石头箱；emptyCell 落点排除不可通行格 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html, store } = setup();
const toasts = [];
UI.toast = m => toasts.push(m);

function mkB(units){
  return { units, selected:units[0], terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, fires:{}, pendingSkill:null, multiTargets:null };
}

(async () => {
  Game.g = Game.newGame(); Game.currentSlot = 1;
  const a1 = Game.createChar('soldier', '甲');

  // ===== T1 AOE 技波及格清瓦砾 =====
  const u1 = Battle.mkAlly(a1, 5, 5);
  Battle.b = mkB([u1]); Battle.b.selected = u1;
  Battle.b.terrain[4][4]='rubble'; Battle.b.terrain[4][5]='rubble'; Battle.b.terrain[6][6]='rubble';   // 两处在爆区、一处在爆区外
  const skAoe = { name:'爆裂震击', type:'attack', shape:'aoe', area:1, mult:0.5, cost:0, cd:0 };
  await Battle.execSkill(u1, { sk:skAoe, cell:[4,4] });
  assert(Battle.b.terrain[4][4]==='stonebox' && Battle.b.terrain[4][5]==='stonebox', 'T1a 爆区两处瓦砾被清除并留下石头物资箱');
  assert(Battle.b.terrain[6][6]==='rubble', 'T1b 爆区外的瓦砾不受影响');
  assert(Battle.b.log.some(e=>e.msgs && e.msgs.some(x=>String(x.m||'').includes('清除了 2 处瓦砾'))), 'T1c 战报记录清除瓦砾');
  assert(u1.hasAttacked===true, 'T1d 技能已消耗本回合攻击');

  // ===== T2 直线技贯穿清除瓦砾 =====
  const u2 = Battle.mkAlly(a1, 5, 5);
  Battle.b = mkB([u2]); Battle.b.selected = u2;
  Battle.b.terrain[5][6]='rubble'; Battle.b.terrain[5][7]='rubble'; Battle.b.terrain[5][8]='rubble';
  const skLine = { name:'贯穿射击', type:'attack', shape:'line', lineLen:3, mult:0.8, cost:0, cd:0 };
  await Battle.execSkill(u2, { sk:skLine, dir:[5,6] });
  assert(Battle.b.terrain[5][6]==='stonebox' && Battle.b.terrain[5][7]==='stonebox' && Battle.b.terrain[5][8]==='stonebox', 'T2 直线弹道 3 格瓦砾全部清除');

  // ===== T3 治疗类技能不清瓦砾（type!=='attack' 不触发）=====
  const u3 = Battle.mkAlly(a1, 5, 5);
  Battle.b = mkB([u3]); Battle.b.selected = u3;
  Battle.b.terrain[5][6]='rubble'; Battle.b.terrain[4][4]='rubble';
  const skBuff = { name:'强身诀', type:'support', shape:'aoe', area:1, mult:0, cost:0, cd:0 };
  await Battle.execSkill(u3, { sk:skBuff, cell:[5,5] });
  assert(Battle.b.terrain[4][4]==='rubble' && Battle.b.terrain[5][6]==='rubble', 'T3 非攻击类技能不清除瓦砾');

  // ===== T4 奔袭（emptyCell）落点排除瓦砾/水面等不可通行格 =====
  const u4 = Battle.mkAlly(a1, 5, 5);
  Battle.b = mkB([u4]); Battle.b.selected = u4;
  Battle.b.terrain[4][5]='rubble'; Battle.b.terrain[6][6]='water';
  u4.skills = [{ name:'奔袭', type:'attack', shape:'aoe', emptyCell:true, area:1, mult:0.7, cost:0, cd:0, range:2 }];
  Battle.pickSkill(0);
  const ts = Battle.b.targetSet || [];
  assert(ts.some(([r,c])=>r===4&&c===6) && !ts.some(([r,c])=>r===4&&c===5) && !ts.some(([r,c])=>r===6&&c===6),
    'T4 奔袭可选普通空格，排除瓦砾格与水面格');

  // ===== T5 sweepCells 统一横扫计算（泼火锅汤 3×1）=====
  const u5 = Battle.mkAlly(a1, 5, 5);
  Battle.b = mkB([u5]); Battle.b.selected = u5;
  const skHuo = { name:'泼火锅汤', type:'attack', shape:'sweep2', sweepLen:3, sweepWid:1, mult:0.7, cost:0, cd:0 };
  const cellsR = Battle.sweepCells(u5, 0, 1, skHuo);
  assert(cellsR.length===3 && cellsR.every(([r])=>r===5) && cellsR[0][1]===6 && cellsR[2][1]===8, 'T5a 右向横扫 = 身前 3×1 直线（5,6)(5,7)(5,8)');
  const cellsD = Battle.sweepCells(u5, 1, 0, skHuo);
  assert(cellsD.length===3 && cellsD.every(([,c])=>c===5) && cellsD[0][0]===6, 'T5b 下向横扫 3 格');

  // ===== T6 AI 评估横扫：枚举四方向取最优 =====
  const e1 = Battle.mkZombie('walker', 5, 6, 1), e2 = Battle.mkZombie('walker', 5, 7, 1);
  Battle.b.units.push(e1, e2);
  const foes = [e1, e2];
  const cast6 = Battle.aiSkillDamage(u5, skHuo, foes);
  assert(cast6 && cast6.shape==='sweep2' && cast6.dir[0]===5 && cast6.dir[1]===6 && cast6.total>0, 'T6 AI 评估横扫取右向（覆盖 2 敌总伤害最优）');

  // ===== T7 AI 执行横扫：走 execSkill 统一通道造成伤害 =====
  const hp0 = e1.hp, hp20 = e2.hp;
  await Battle.aiExecuteZombie(u5, { type:'skill', sk:skHuo, cast:{ shape:'sweep2', dir:[5,6] } });
  assert(e1.hp < hp0 && e2.hp < hp20, `T7 AI 横扫命中直线两敌（${hp0-e1.hp}/${hp20-e2.hp} 伤害）`);
  assert(u5.hasAttacked===true, 'T7b AI 施放后消耗攻击次数');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
