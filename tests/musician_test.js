/* V72 音乐家：属性/招募价/技能数值/AOE 体力回复（2格曼哈顿含自己）/CD/初始随机池 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
const toasts = [];
UI.toast = m => toasts.push(m);

function mkB(units){
  return { units, selected:units[0], terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
}

(async () => {
  // ===== T1 职业定义 =====
  const M = DATA.CLASSES.musician;
  const b = M.base;
  assert(M && M.name==='音乐家' && M.price===180 && M.food===2, 'T1a 音乐家定义（180 金币 / 食物 2）');
  assert(b.maxHp===150 && b.maxStamina===100 && b.atk===25 && b.def===5, 'T1b 基础属性 150/100/25/5');
  assert(b.range===2 && b.move===2 && b.critRate===5 && b.critDmg===150, 'T1c 射程2/移速2/暴击5%/150%');

  // ===== T2 技能定义 =====
  const sk = M.skills[0];
  assert(M.skills.length===1 && sk.name==='演奏音乐', 'T2a 技能「演奏音乐」');
  assert(sk.cost===40 && sk.regenAmt===10 && sk.range===2 && sk.cd===3, 'T2b 消耗40 / 回复10 / 范围2 / CD3');
  assert(sk.type==='regen' && sk.shape==='regenAoe', 'T2c AOE 体力回复类型（type regen + shape regenAoe）');

  // ===== T3 实例化属性 =====
  Game.g = Game.newGame(); Game.currentSlot = 1;
  const mus = Game.createChar('musician', '乐师');
  Game.g.chars.push(mus);
  mus.talents = []; Game.applyTalents(mus); Game.recalc(mus);   // 清随机天赋，验证纯基础面板
  assert(mus.maxHp===150 && mus.maxStamina===100 && mus.atk===25 && mus.def===5, 'T3 实例化基础属性正确');

  // ===== T4 AOE 结算：范围内友方+自己恢复，范围外与敌人不受影响 =====
  const a1 = Game.createChar('soldier', '甲'), a2 = Game.createChar('civilian', '乙'), a3 = Game.createChar('hunter', '丙');
  const foe = Battle.mkZombie('walker', 5, 7, 1);
  const uMus = Battle.mkAlly(mus, 5, 5);
  const uA = Battle.mkAlly(a1, 5, 6);    // 曼哈顿 1
  const uB = Battle.mkAlly(a2, 3, 5);    // 曼哈顿 2
  const uC = Battle.mkAlly(a3, 2, 5);    // 曼哈顿 3，范围外
  [uMus, uA, uB, uC].forEach(u=>{ u.stamina = 50; });
  foe.stamina = 50;
  Battle.b = mkB([uMus, uA, uB, uC, foe]);
  Battle.b.selected = uMus;
  await Battle.pickSkill(0);   // regenAoe：pickSkill 内部结算 victim 并完成消耗/统计
  assert(uA.stamina===60 && uB.stamina===60, `T4a 范围内友方各 +10（A=${uA.stamina} B=${uB.stamina}）`);
  assert(uC.stamina===50, 'T4b 范围外友方（3格）不恢复');
  assert(foe.stamina===50, 'T4c 敌人不受影响');
  assert(uMus.stamina===20, `T4d 自己含在内：50-40+10=${uMus.stamina}`);
  assert(uMus.hasAttacked===true, 'T4e 演奏后标记已行动');
  assert(Battle.b.stats[uMus.uid] && Battle.b.stats[uMus.uid].heal===30, `T4f 治疗统计 +30（${Battle.b.stats[uMus.uid] && Battle.b.stats[uMus.uid].heal}）`);

  // ===== T5 上限钳制：体力仅差 5 时只恢复 5 =====
  const m2 = Battle.mkAlly(mus, 5, 5); m2.stamina = 60;
  const f2 = Battle.mkAlly(a1, 5, 6); f2.stamina = f2.maxStamina - 5;
  Battle.b = mkB([m2, f2]);
  Battle.b.pendingSkill = sk;
  await Battle.doRegenAoe(m2, [m2, f2]);
  assert(f2.stamina===f2.maxStamina, `T5a 满体力钳制（${f2.stamina}/${f2.maxStamina}）`);
  assert(Battle.b.stats[m2.uid].heal===15, `T5b 实际恢复合计 10+5=15（${Battle.b.stats[m2.uid].heal}）`);

  // ===== T6 全员满体力 → 拒绝释放不扣体力 =====
  const m3 = Battle.mkAlly(mus, 5, 5); m3.stamina = m3.maxStamina;
  const f3 = Battle.mkAlly(a1, 5, 6); f3.stamina = f3.maxStamina;
  Battle.b = mkB([m3, f3]);
  Battle.b.selected = m3;
  const st0 = m3.stamina;
  Battle.pickSkill(0);
  assert(m3.stamina===st0 && toasts.some(t=>t.includes('没有需要回复体力')), 'T6 全员满体力拒绝演奏');

  // ===== T7 CD 生效 =====
  const m4 = Battle.mkAlly(mus, 5, 5); m4.stamina = 50;
  const f4 = Battle.mkAlly(a1, 5, 6); f4.stamina = 50;
  Battle.b = mkB([m4, f4]);
  Battle.b.selected = m4;
  Battle.pickSkill(0);
  await Battle.doRegenAoe(m4, [m4, f4]);
  assert(Battle.skCd(m4, sk) > 0, `T7 演奏后进入冷却（剩 ${Battle.skCd(m4, sk)} 回合）`);

  // ===== T8 初始随机池自动接入（10 职业抽 3 不重复，期望 100 轮出现 ≥30 次） =====
  let musCount = 0, okCombo = true;
  for (let i=0; i<100; i++) {
    const g = Game.newGame();
    if (g.chars.some(c=>c.cls==='musician')) musCount++;
    const clss = g.chars.map(c=>c.cls);
    if (clss.length!==3 || new Set(clss).size!==3 || clss.some(k=>!DATA.CLASSES[k])) okCombo = false;
  }
  assert(okCombo, 'T8a 新游戏仍为 3 人且职业互不重复');
  assert(musCount>=10, `T8b 音乐家已进初始随机池（100 轮出现 ${musCount} 次）`);

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
