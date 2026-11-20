/* 农场建筑验证：建造/升级/指派/结算/迁移 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1, s2] = g.chars;

(async () => {
  // ===== T1 定义 =====
  const F = DATA.FARM;
  assert(F.buildCost===90 && F.upgradeCost===150 && F.maxLv===5 && F.workCost===50, 'T1a 农场参数（90建/150升/Lv5/50⚡）');
  assert(F.out(1)===2 && F.out(3)===6 && F.out(5)===10, 'T1b 每级产出 2/4/6/8/10');

  // ===== T2 建造/升级 =====
  g.res.gold = 400;
  Game.buildFarm();
  assert(g.farmLv===1 && g.res.gold===310, 'T2a 建造扣 90 金币');
  Game.upgradeFarm();
  assert(g.farmLv===2 && g.res.gold===85, 'T2b 升级扣 1.5×150=225 金币到 Lv.2');
  Game.upgradeFarm();   // 金币不足
  assert(g.farmLv===2, 'T2c 金币不足不升级');

  // ===== T3 指派：任意职业 =====
  g.res.gold = 100;
  const civ = Game.createChar('civilian'); g.chars.push(civ);   // 初始职业已随机化，显式建平民
  Game.assignFarm(civ.id);
  assert(g.farmWorker===civ.id, 'T3a 平民（任意职业）可指派农场');
  Game.unassignFarm();
  assert(g.farmWorker===null, 'T3b 撤职');
  Game.assignFarm(s1.id);
  assert(g.farmWorker===s1.id, 'T3c 军人也可指派（任意职业）');
  s1.stamina = 10;
  Game.assignFarm(civ.id);   // s1 体力不足换人？assignFarm 只校验被指派者
  assert(g.farmWorker===civ.id, 'T3d 换指派成功（校验的是被指派者体力）');
  Game.unassignFarm();
  civ.injured = true;
  Game.assignFarm(civ.id);
  assert(g.farmWorker===null, 'T3e 重伤者被拒');
  civ.injured = false; civ.stamina = 10;
  Game.assignFarm(civ.id);
  assert(g.farmWorker===null, 'T3f 体力不足 50 被拒');
  civ.stamina = 60;
  Game.assignFarm(civ.id);
  assert(g.farmWorker===civ.id, 'T3g 体力足够可指派');

  // ===== T4 每日结算：Lv.2 产 4 食物 扣 50⚡ =====
  civ.stamina = Math.min(100, Game.effSt(civ)); civ.hp = civ.maxHp;   // ≤上限，避免新天赋改上限后恢复被截断
  g.res.food = 30;
  const food0 = g.res.food, st0 = civ.stamina;
  const r = await Game.nextDay();
  assert(r.farm && r.farm.produced===4, 'T4a Lv.2 农场产出 4 食物');
  assert(g.res.food===food0+4-r.cost, `T4b 入账后食物 ${g.res.food}（+4 产 -${r.cost} 全员吃饭）`);
  assert(r.farm.cost===50 && civ.stamina===st0, 'T4c 农场当值扣 50⚡（晚饭+50 抵消，体力不变）');
  assert(civ.stamina>=0, 'T4d 体力不被扣为负');

  // ===== T5 体力不足停产 =====
  civ.stamina = 20;
  const r5 = await Game.nextDay();
  assert(r5.farm && r5.farm.blocked==='stamina', 'T5a 体力不足农场停产');
  assert(!r5.farm.produced, 'T5b 停产无产出');
  assert(civ.stamina===20-0+50, 'T5c 停产不扣体力（晚饭恢复 50）');

  // ===== T6 未指派停产 =====
  Game.unassignFarm();
  const r6 = await Game.nextDay();
  assert(r6.farm && r6.farm.blocked==='noworker', 'T6a 未指派耕作者停产');

  // ===== T7 农场当值不影响出战（统一 Game.canBattle） =====
  Game.assignFarm(civ.id);
  const avail = g.chars.filter(Game.canBattle);
  assert(avail.some(c=>c.id===civ.id), 'T7a 农场当值者仍在可出战名单');

  // ===== T7b 厨房当值同样不影响出战（仅重伤/体力不足禁止） =====
  const chefT = Game.createChar('chef'); chefT.stamina = 100; g.chars.push(chefT);
  Game.assignKitchen(chefT.id);
  assert(g.chars.filter(Game.canBattle).some(c=>c.id===chefT.id), 'T7b1 厨房当值者可出战');
  chefT.injured = true;
  assert(!Game.canBattle(chefT), 'T7b2 重伤不可出战');
  chefT.injured = false; chefT.stamina = 10;
  assert(!Game.canBattle(chefT), 'T7b3 体力<15 不可出战');
  chefT.stamina = 100;

  // ===== T8 旧档迁移 =====
  const oldSave = { v:1, ts:Date.now(), day:3, uid:5000, state:{ day:3, weather:'sunny', res:{gold:100,med:0,metal:0,food:10}, chars:[], seenMilestones:[], kitchenLv:1, kitchenChef:null } };
  Game.applySave(oldSave, 2);
  assert(Game.g.farmLv===0 && Game.g.farmWorker===null, 'T8a 旧档迁移补 farmLv/farmWorker 默认值');

  // ===== T9 UI 渲染不炸 =====
  Game.g.farmLv = 3; Game.g.farmWorker = null;
  UI.renderBuild();
  assert((elems['content']||Object.values(elems)[0]) && true, 'T9a renderBuild 含农场段不炸');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
