/* 寝室建筑验证 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1, s2] = g.chars;

(async () => {
  // ===== T1 配置层 =====
  const D = DATA.DORM;
  assert(D && D.buildCost===80 && D.upgradeCost===140 && D.maxLv===5 && D.regenAmt===50, 'T1a 寝室配置 80/140/Lv5/+50');
  assert(g.dormLv===0 && Array.isArray(g.dormBeds) && !g.dormBeds.length, 'T1b 初始状态未建造');

  // ===== T2 建造与升级 =====
  g.res.gold = 200;
  Game.buildDorm();
  assert(g.dormLv===1 && g.res.gold===120, 'T2a 建造成功 200→120 金币 Lv.1');
  Game.upgradeDorm();
  assert(g.dormLv===1, 'T2b 金币不足升级被拒');
  g.res.gold = 500;
  Game.upgradeDorm();
  assert(g.dormLv===2 && g.res.gold===318, 'T2c 升级到 Lv.2 扣 1.3×140=182');

  // ===== T3 床位分配 =====
  Game.assignBed(s1.id);
  assert(g.dormBeds.length===1 && g.dormBeds[0]===s1.id, 'T3a 军人入住');
  Game.assignBed(s1.id);
  assert(g.dormBeds.length===1, 'T3b 重复入住被拒');
  Game.assignBed(s2.id);
  assert(g.dormBeds.length===2, 'T3c 平民入住 Lv.2 满');
  Game.assignBed('nobody');
  assert(g.dormBeds.length===2, 'T3d 满员第3人被拒');
  Game.unassignBed(s2.id);
  assert(g.dormBeds.length===1 && g.dormBeds[0]===s1.id, 'T3e 平民退房');

  // ===== T4 过夜结算 =====
  const s3 = Game.createChar('civilian'); g.chars.push(s3);
  s1.stamina = 100; s1.maxStamina = 150; s1.hp = 100; s1.maxHp = 250;
  s2.stamina = 100; s2.maxStamina = 120; s2.hp = 100; s2.maxHp = 200;
  s3.stamina = 50;  s3.maxStamina = 120; s3.hp = 50;  s3.maxHp = 200; s3.injured = false;
  g.res.food = 0;
  g.dormLv = 2; g.dormBeds = [s1.id, s2.id];
  const r = Game.nextDay([s1.id, s3.id]);
  assert(!r.shortage, 'T4a 手动分配开饭');
  assert(s1.stamina===Game.effSt(s1) && s1.hp===200, 'T4b 军人 吃饱+睡床 = +100⚡+100❤️（⚡封顶装备后上限）');
  assert(s2.stamina===Game.effSt(s2) && s2.hp===150, 'T4c 平民 没饭吃但睡床 = 独立+50⚡+50❤️（⚡封顶装备后上限）');
  assert(s3.stamina===100 && s3.hp===100, 'T4d 平民 吃饱不睡床 = +50⚡+50❤️');
  assert(r.dorm && r.dorm.slept.length===2 && r.dorm.amt===50, 'T4e 结算报告含寝室 2 人');
  const msg = Game.mealMsg(r);
  assert(msg.includes('安睡寝室') && msg.includes(s1.name) && msg.includes(s2.name), 'T4f mealMsg 提示寝室');

  // ===== T5 重伤自愈（睡满即愈）=====
  s2.injured = true; s2.hp = 150; s2.maxHp = 200;
  g.res.food = 100;
  const r2 = Game.nextDay();
  assert(s2.injured===false && s2.hp===Math.min(Game.effHp(s2),250), 'T5a 重伤者 吃饭+睡床 = +100 回满自愈（仍穿装备）');
  assert(s1.stamina===Game.effSt(s1), 'T5b 恢复封顶不溢出（装备后上限）');

  // ===== T6 旧档迁移 =====
  const oldSave = { v:1, ts:Date.now(), day:3, uid:5000, state:{ day:3, weather:'sunny', res:{gold:100,med:0,metal:0,food:10}, chars:[], seenMilestones:[], kitchenLv:1, kitchenChef:null } };
  Game.applySave(oldSave, 1);
  assert(Game.g.dormLv===0 && Array.isArray(Game.g.dormBeds), 'T6 旧档自动补 dormLv/dormBeds');

  // ===== T7 寝室卡内直接指派（V178：点击寝室 → 入住/换人列表；职务指派入口保留） =====
  const g7 = Game.newGame();
  Game.g = g7; g7.res.gold = 500;
  Game.buildDorm();                       // Lv.1 → 1 个床位
  UI.campSel = 'dorm'; UI.dormPick = false;
  UI.renderBuild();
  let bh = elems['build-page'].innerHTML;
  assert(bh.includes('入住 / 换人') && bh.includes('职务指派'), 'T7a 建成后显示「入住 / 换人」按钮并保留职务指派提示');
  assert(!bh.includes('craft-pick'), 'T7b 未展开时不渲染选择列表');
  UI.toggleDormPick();
  bh = elems['build-page'].innerHTML;
  assert(bh.includes('craft-pick') && bh.includes('收起列表'), 'T7c 展开后渲染角色选择列表');
  assert(g7.chars.filter(c=>!c.dead).every(c=>bh.includes(c.name)), 'T7d 列表含全部存活成员');
  const pick1 = g7.chars.find(c=>!c.dead);
  UI.quickAssignBed(pick1.id);
  bh = elems['build-page'].innerHTML;
  assert(g7.dormBeds.length===1 && g7.dormBeds[0]===pick1.id, 'T7e 点选角色直接入住');
  assert(bh.includes('入住：') && !bh.includes('craft-pick') && bh.includes('入住 / 换人'), 'T7f 入住后收起列表，入住名单显示在卡内');
  Game.unassignBed(pick1.id);
  UI.dormPick = true; UI.renderBuild();
  bh = elems['build-page'].innerHTML;
  const before = g7.dormBeds.length;
  const html_full = bh;
  assert(html_full.includes(pick1.name), 'T7g 退房后列表仍可选人');
  // 满员拦截：Lv.1 床位住 1 人后，其余成员行禁点（无 onclick）
  Game.assignBed(pick1.id);
  UI.renderBuild();
  bh = elems['build-page'].innerHTML;
  const others = g7.chars.filter(c=>!c.dead && c.id!==pick1.id);
  const otherRow = others.length ? others[0].name : '';
  const rowIdx = bh.indexOf(otherRow);
  const rowHtml = rowIdx>=0 ? bh.slice(Math.max(0,rowIdx-400), rowIdx+200) : '';
  assert(others.length===0 || !rowHtml.includes('quickAssignBed'), 'T7h 满员后其余成员行不可再点入住');
  assert(g7.dormBeds.length===1, 'T7i 床位状态正确');
  UI.dormPick = false;

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
