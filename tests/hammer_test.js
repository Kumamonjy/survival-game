/* V204 新武器「大铁锤」🔨：攻+28 / 移速-1 / 体力-10 / 射程2，自带「挥扫」（与铁锹完全同款 sweep2 3×1 70% 25⚡ CD3），配方 70💰+12⚙️+4🪵 / 28⚡（普通档不入 TOP） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
{ const sm = Game.createChar('civilian','工匠甲'); sm.stamina = 9999; sm.injured = false;
  g.chars.push(sm); g.workshopLv = 1; Game.assignWorkshop(sm.id); }
g.res.gold = 500; g.res.wood = 30; g.res.metal = 40; g.res.fabric = 30;

(async () => {
  // ===== T1 定义：挥扫与铁锹完全同款 =====
  const hm = DATA.EQUIPS.hammer;
  assert(hm && hm.name==='大铁锤' && hm.slot==='weapon' && hm.icon==='🔨', 'T1a 大铁锤注册（武器槽 🔨）');
  assert(hm.stats.atk===28 && hm.stats.move===-1 && hm.stats.stamina===-10 && hm.range===2, 'T1b 攻+28 / 移速-1 / 体力-10 / 射程2');
  assert(JSON.stringify(hm.skill)===JSON.stringify(DATA.EQUIPS.shovel.skill), 'T1c 挥扫与铁锹参数完全一致（sweep2 3×1 70% 25⚡ CD3）');
  assert(hm.desc.includes('+28') && hm.desc.includes('移速 -1') && hm.desc.includes('体力值 -10'), 'T1d desc 同步');

  // ===== T2 配方与工坊打造（普通档）=====
  const rc = DATA.RECIPES.find(r=>r.id==='hammer');
  assert(rc && rc.cost.gold===47 && rc.cost.wood===6 && rc.cost.metal===17 && rc.stamina===28, 'T2a 配方 47💰+6🪵+17⚙️ / 28⚡（V226 金币下调材料大增）');
  assert(!DATA.TOP_EQUIPS.includes('hammer'), 'T2b 普通档：不进 TOP_EQUIPS（d≤2 区域可掉）');
  Game.craft('hammer');
  const inst = (g.bagInst||[]).find(e=>e.id==='hammer');
  assert(inst && inst.lv===0, 'T2c 打造入包');

  // ===== T3 属性链：effAtk+28 / 移速-1 / 体力-10 =====
  const s1 = Game.createChar('soldier','抡锤者'); s1.stamina=9999; s1.talents=[]; Game.applyTalents(s1); Game.recalc(s1); g.chars.push(s1);
  const mv0 = s1.move, st0 = Game.effSt(s1);
  Game.equipChar(s1.id, 'weapon', inst.uid);
  assert(Game.effAtk(s1)===s1.atk+28, 'T3a effAtk +28');
  assert(Game.effMove(s1)===Math.max(1, mv0-1), `T3b 移速 ${mv0}→${Game.effMove(s1)}（-1）`);
  assert(Game.effSt(s1)===st0-10, `T3c 体力上限 ${st0}→${Game.effSt(s1)}（-10）`);
  assert(Game.effRange(s1)===2, 'T3d 射程 2');

  // ===== T4 战斗：mkAlly 移速/体力生效 + 横扫结算 =====
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(s1, 5, 5);
  Battle.b.units.push(u);
  u.critRate = 0;
  assert(u.move===Math.max(1, mv0-1), 'T4a 战斗单位移速含装备惩罚');
  assert(u.maxStamina===Game.effSt(s1) && u.skills.some(s=>s.name==='挥扫'), 'T4b 体力上限与技能表含挥扫');
  const f1 = Battle.mkZombie('walker', 5, 6, 1), f2 = Battle.mkZombie('walker', 5, 7, 1);
  f1.hp=f1.maxHp; f2.hp=f2.maxHp; f1.def=0; f2.def=0;
  Battle.b.units.push(f1, f2);
  u.stamina = 100;
  const h10=f1.hp, h20=f2.hp;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.hammer.skill, dir:[5,6] });
  const dmg = Math.max(1, Math.round(u.atk*0.7));
  assert(f1.hp===h10-dmg && f2.hp===h20-dmg, `T4c 横扫直线双敌各 70% 攻（-${dmg}，攻 28 档更高）`);
  assert(u.stamina===75 && u.cds['挥扫']===3, 'T4d 消耗 25⚡ / 进 CD 3');

  // ===== T5 掉落池：普通武器（d≤2 可掉、加油站仅武器池含它）=====
  let lowHit = false;
  for (let i=0;i<600;i++){ const d = Battle.rollDropEquip('hospital'); if (d && d.id==='hammer'){ lowHit = true; break; } }
  assert(lowHit, 'T5a 医院（d2）采样可掉大铁锤（普通档）');

  // ===== T6 百科收录 =====
  assert(html.includes('大铁锤') && html.includes('挥扫'), 'T6 装备图鉴含大铁锤与挥扫');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
