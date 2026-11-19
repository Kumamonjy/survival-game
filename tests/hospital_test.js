/* V70 医院 + 绷带：建造/指派（医生或护士）/生产/战斗回血止血/一键分配/UI */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1] = g.chars;
const toasts = [];
UI.toast = m => toasts.push(m);

function mkB(units){
  return { units, selected:units[0], terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
}

(async () => {
  // ===== T1 医院定义 =====
  assert(DATA.HOSPITAL && DATA.HOSPITAL.name==='医院' && DATA.HOSPITAL.buildCost===180, 'T1 医院定义（180 金币建造，不可升级）');
  const PB = DATA.PRODUCE.bandage;
  assert(PB && PB.building==='hospitalLv' && PB.duty==='hospitalDoc' && PB.stamina===10, 'T1b 生产配置（hospitalLv/hospitalDoc/10⚡）');
  assert(PB.mats.fabric===2 && PB.mats.med===1, 'T1c 材料 2🧵+1💊');

  // ===== T2 绷带定义 =====
  const BA = DATA.EQUIPS.bandage;
  const sk = BA.skill;
  assert(BA && BA.name==='绷带' && BA.consumable===true && !BA.stats && BA.icon==='🩹', 'T2a 绷带消耗品定义（无属性）');
  assert(sk.type==='heal' && sk.flatHeal===25 && sk.mult===0 && sk.range===1 && sk.includeSelf===true && sk.cost===0, 'T2b 技能参数（25 血/0 体耗/1 格/含自己）');
  assert(Array.isArray(sk.cureList) && sk.cureList.length===1 && sk.cureList[0]==='bleed', 'T2c cureList 只解流血');

  // ===== T3 建造 =====
  g.res.gold = 100;
  Game.buildHospital();
  assert(g.hospitalLv===0, 'T3a 金币不足拒绝建造');
  g.res.gold = 500;
  Game.buildHospital();
  assert(g.hospitalLv===1 && g.res.gold===320, 'T3b 建造成功扣 180');

  // ===== T4 指派（医生或护士，cls 数组） =====
  const doc = Game.createChar('doctor', '白大夫');
  g.chars.push(doc);
  const nrs = Game.createChar('nurse', '小护');
  g.chars.push(nrs);
  const civ = Game.createChar('civilian', '路人');
  g.chars.push(civ);
  Game.assignHospital(civ.id);
  assert(g.hospitalDoc===null, 'T4a 医生/护士以外拒绝（cls 数组）');
  Game.assignHospital(doc.id);
  assert(g.hospitalDoc===doc.id, 'T4b 医生指派成功');
  assert(Game.dutyOf(doc.id)==='医院当值', 'T4c dutyOf 职务名');
  Game.unassignHospital();
  assert(g.hospitalDoc===null, 'T4d 撤职成功');
  Game.assignHospital(nrs.id);
  assert(g.hospitalDoc===nrs.id, 'T4e 护士指派成功');
  Game.unassignHospital();
  const doc2 = Game.createChar('doctor', '二大夫');
  g.chars.push(doc2);
  g.kitchenChef = doc2.id;
  Game.assignHospital(doc2.id);
  assert(g.hospitalDoc===null, 'T4f 职务冲突拒绝');

  // ===== T5 生产正路径 =====
  g.bagInst = g.bagInst.filter(x=>x.id!=='bandage');
  Game.assignHospital(doc.id);
  doc.stamina = doc.maxStamina; g.res.fabric = 5; g.res.med = 10;
  const fab0 = g.res.fabric, med0 = g.res.med, st0 = doc.stamina;
  Game.makeBandage();
  assert(g.res.fabric===fab0-2 && g.res.med===med0-1 && doc.stamina===st0-10, 'T5a 扣除 10⚡+2🧵+1💊');
  assert(g.bagInst.filter(x=>x.id==='bandage').length===1, 'T5b 背包 +1 绷带');

  // ===== T6 生产反路径 =====
  g.bagInst = g.bagInst.filter(x=>x.id!=='bandage');
  g.res.fabric = 1;
  Game.makeBandage();
  assert(!g.bagInst.some(x=>x.id==='bandage'), 'T6a 布料 1 个（不足 2）拒绝');
  g.res.fabric = 5; g.res.med = 0;
  Game.makeBandage();
  assert(!g.bagInst.some(x=>x.id==='bandage'), 'T6b 药物不足拒绝');
  g.res.med = 10; doc.injured = true;
  Game.makeBandage();
  assert(!g.bagInst.some(x=>x.id==='bandage'), 'T6c 重伤拒绝');
  doc.injured = false; doc.stamina = 5;
  Game.makeBandage();
  assert(!g.bagInst.some(x=>x.id==='bandage'), 'T6d 体力不足 10 拒绝');
  doc.stamina = 100; g.hospitalDoc = null;
  Game.makeBandage();
  assert(!g.bagInst.some(x=>x.id==='bandage'), 'T6e 无医务员拒绝');
  Game.assignHospital(doc.id);

  // ===== T7 战斗使用：恢复 25 + 只解流血 =====
  const me = Battle.mkAlly(doc, 5, 5);
  const hurt = Battle.mkAlly(s1, 5, 4);
  hurt.hp = hurt.maxHp - 80;
  hurt.sts = { bleed:{ t:3 }, poison:{ t:3 }, strong:{ t:2 } };
  Battle.b = mkB([me, hurt]);
  Battle.b.pendingSkill = DATA.EQUIPS.bandage.skill;
  const hp0 = hurt.hp;
  await Battle.doHeal(me, hurt);
  assert(hurt.hp === hp0 + 25, `T7a 恢复 25 生命（+${hurt.hp-hp0}）`);
  assert(!hurt.sts.bleed, 'T7b 流血解除');
  assert(hurt.sts.poison, 'T7c 中毒保留（只解流血）');
  assert(hurt.sts.strong, 'T7d 增益保留');

  // ===== T8 满血但流血者可选为目标 + 道具消耗 =====
  Battle.b = mkB([me, hurt]);
  hurt.hp = hurt.maxHp;
  hurt.sts = { bleed:{ t:3 } };
  me.skills = [DATA.EQUIPS.bandage.skill];
  me.item = { id:'bandage', count:2 };
  me.stamina = 100; me.maxStamina = 150;
  me.hasAttacked = false; me.hasMoved = false;
  Battle.b.selected = me; Battle.b.mode = null;
  Battle.pickSkill(0);
  const tset = (Battle.b.targetSet||[]).map(p=>p.join(','));
  assert(tset.includes('5,4'), 'T8a 满血但流血者可被选为目标（包扎止血）');
  Battle.b.pendingTarget = hurt;
  await Battle.doHeal(me, hurt);
  assert(me.item.count===1, `T8b 使用后消耗 1 个绷带（剩 ${me.item.count}）`);

  // ===== T9 UI 渲染 =====
  UI.campSel='hospital';
  UI.renderBuild();
  const bh = elems['build-page'].innerHTML;
  assert(bh.includes('Game.buildHospital()') || bh.includes('Game.makeBandage()'), 'T9a 建筑页医院卡渲染');
  assert(bh.includes('Game.makeBandage()') && bh.includes('10⚡ + 2🧵 + 1💊'), 'T9b 医院卡生产按钮与材料说明');
  UI.renderDuty();
  const dh = elems['duty-page'].innerHTML;
  assert(dh.includes('Game.unassignHospital()') && dh.includes('医院当值'), 'T9c 职务页医院面板渲染');
  assert(dh.includes('Game.assignHospital'), 'T9d 医院候选名单渲染');

  // ===== T10 一键最佳分配：医院补位 =====
  Game.g = Game.newGame(); Game.currentSlot = 1;
  const g2 = Game.g;
  g2.hospitalLv = 1;
  const doc3 = Game.createChar('doctor', '三大夫'); doc3.stamina = 120; g2.chars.push(doc3);
  const nrs2 = Game.createChar('nurse', '二护士'); nrs2.stamina = 130; g2.chars.push(nrs2);
  g2.chars.forEach(c=>{ if((c.cls==='doctor'||c.cls==='nurse') && c!==doc3 && c!==nrs2) c.stamina = 0; });   // 初始随机医务人员压低，保证显式创建者胜出
  const acts = Game.recommendDuty();
  assert(g2.hospitalDoc===(nrs2.stamina>=doc3.stamina?nrs2.id:doc3.id), `T10a 医院自动补位体力最高医务人员（${(g2.chars.find(c=>c.id===g2.hospitalDoc)||{}).name}）`);
  assert(acts.some(a=>a.includes('医院')), 'T10b 分配摘要含医院');
  const acts2 = Game.recommendDuty();
  assert(acts2.filter(a=>a.includes('医院')).length===0, 'T10c 已满配时重复点击不再换人');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
