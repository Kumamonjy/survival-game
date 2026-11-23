/* V209 新武器「木盾」🛡️：HP+50/防+15/体力-10/移动-1，射程1，纯防御无攻击无技能（坦克定位），68💰+8🪵+3🧵/18⚡（增益减益对冲定价） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
let tankId;
{ const tank = Game.createChar('civilian','工匠甲'); tank.stamina = 9999; tank.injured = false;
  g.chars.push(tank); g.workshopLv = 1; Game.assignWorkshop(tank.id); tankId = tank.id; }
g.res.gold = 500; g.res.wood = 30; g.res.fabric = 30;

(async () => {
  // ===== T1 定义 =====
  const ws = DATA.EQUIPS.woodshield;
  assert(ws && ws.slot==='weapon' && ws.stats.hp===50 && ws.stats.def===15 && ws.stats.stamina===-10 && ws.stats.move===-1, 'T1a 木盾：武器槽 HP+50/防+15/体力-10/移动-1');
  assert(!ws.stats.atk && !ws.skill && ws.range===1, 'T1b 纯防御：无攻击加成、无技能、射程 1');

  // ===== T2 配方与工坊打造 =====
  const rc = DATA.RECIPES.find(r=>r.id==='woodshield');
  assert(rc && rc.cost.gold===45 && rc.cost.wood===13 && rc.cost.fabric===5 && rc.stamina===18, 'T2a 配方 45💰+13🪵+5🧵 / 18⚡（V226 金币下调材料大增）');
  Game.craft('woodshield');
  const inst = (g.bagInst||[]).find(e=>e.id==='woodshield');
  assert(inst && inst.lv===0, 'T2b 打造入包');

  // ===== T3 穿戴：四项属性全部生效，攻击/射程不受影响 =====
  const sm = g.chars.find(x=>x.id===tankId);
  const h0 = Game.effHp(sm), d0 = Game.effDef(sm), s0 = Game.effSt(sm), m0 = Game.effMove(sm), a0 = Game.effAtk(sm);
  Game.equipChar(sm.id,'weapon',inst.uid);
  assert(Game.effHp(sm)===h0+50 && Game.effDef(sm)===d0+15, 'T3a 生命+50 / 防御+15 生效');
  assert(Game.effSt(sm)===s0-10 && Game.effMove(sm)===m0-1, 'T3b 体力-10 / 移动-1 生效');
  assert(Game.effAtk(sm)===a0 && Game.effRange(sm)===1, 'T3c 攻击力不变（基础值），射程 1');

  // ===== T4 掉落分层（武器槽 → 加油站仅武器池可出；非顶级） =====
  assert(!DATA.TOP_EQUIPS.includes('woodshield'), 'T4a 非顶级装备');
  const ZG = Battle.zoneDef({id:'gas'});
  let gpool = Object.keys(DATA.EQUIPS).filter(id=>DATA.EQUIPS[id].slot===(ZG.dropSlot||'weapon'));
  if (ZG.danger<=2) gpool = gpool.filter(id=>!DATA.TOP_EQUIPS.includes(id));
  assert(gpool.includes('woodshield'), 'T4b 加油站仅武器池含木盾');

  // ===== T5 百科与工坊页收录 =====
  assert(html.includes('木盾') && html.includes('纯防御盾牌'), 'T5 装备图鉴含木盾');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
