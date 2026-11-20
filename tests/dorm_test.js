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
  assert(g.dormLv===2 && g.res.gold===290, 'T2c 升级到 Lv.2 扣 1.5×140=210');

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

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
