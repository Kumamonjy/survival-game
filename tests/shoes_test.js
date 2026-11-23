/* V208 新鞋子「雨靴」👢（HP+15/防+10，58💰+6🧵+2⚙️/12⚡）与「棉鞋」🧦（HP+25/防+8，55💰+8🧵/12⚡）：补齐鞋子升级线，普通掉落池可掉 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
{ const sm = Game.createChar('civilian','工匠甲'); sm.stamina = 9999; sm.injured = false;
  g.chars.push(sm); g.workshopLv = 1; Game.assignWorkshop(sm.id); }
g.res.gold = 500; g.res.fabric = 30; g.res.metal = 30;

(async () => {
  // ===== T1 定义 =====
  const rb = DATA.EQUIPS.rainboots, cs = DATA.EQUIPS.cottonshoes;
  assert(rb && rb.slot==='shoes' && rb.stats.hp===15 && rb.stats.def===10, 'T1a 雨靴：鞋子槽 HP+15 / 防+10');
  assert(cs && cs.slot==='shoes' && cs.stats.hp===25 && cs.stats.def===8, 'T1b 棉鞋：鞋子槽 HP+25 / 防+8');

  // ===== T2 配方与工坊打造 =====
  const rr = DATA.RECIPES.find(r=>r.id==='rainboots'), cr = DATA.RECIPES.find(r=>r.id==='cottonshoes');
  assert(rr && rr.cost.gold===39 && rr.cost.fabric===9 && rr.cost.metal===4 && rr.stamina===12, 'T2a 雨靴配方 39💰+9🧵+4⚙️ / 12⚡（V226 金币下调材料大增）');
  assert(cr && cr.cost.gold===37 && cr.cost.fabric===12 && cr.stamina===12, 'T2b 棉鞋配方 37💰+12🧵 / 12⚡（V226 金币下调材料大增）');
  Game.craft('rainboots'); Game.craft('cottonshoes');
  const rbInst = (g.bagInst||[]).find(e=>e.id==='rainboots');
  const csInst = (g.bagInst||[]).find(e=>e.id==='cottonshoes');
  assert(rbInst && csInst, 'T2c 两双鞋均打造入包');

  // ===== T3 穿戴属性生效 =====
  const sm = g.chars[0];
  const d0 = Game.effDef(sm), h0 = Game.effHp(sm);
  Game.equipChar(sm.id,'shoes',rbInst.uid);
  assert(Game.effDef(sm)===d0+10 && Game.effHp(sm)===h0+15, 'T3a 穿雨靴：防御 +10 / 生命 +15 生效');
  Game.equipChar(sm.id,'shoes',csInst.uid);
  assert(Game.effDef(sm)===d0+8 && Game.effHp(sm)===h0+25, 'T3b 换穿棉鞋：防御 +8 / 生命 +25 生效（雨靴回包）');

  // ===== T4 掉落分层（确定性池构建验证，避免采样波动） =====
  assert(!DATA.TOP_EQUIPS.includes('rainboots') && !DATA.TOP_EQUIPS.includes('cottonshoes'), 'T4a 非顶级装备');
  const ZH = Battle.zoneDef({id:'hospital'});
  let hpool = Object.keys(DATA.EQUIPS);
  if (ZH && ZH.dropSlot) hpool = hpool.filter(id=>DATA.EQUIPS[id].slot===ZH.dropSlot);
  if (ZH && ZH.danger<=2) hpool = hpool.filter(id=>!DATA.TOP_EQUIPS.includes(id));
  assert(hpool.includes('rainboots') && hpool.includes('cottonshoes'), 'T4b 医院（20% 全类型池）掉落池含新鞋');
  const gasIds=new Set(); for(let i=0;i<400;i++){ const d=Battle.rollDropEquip('gas'); if(d) gasIds.add(d.id); }
  assert(!gasIds.has('rainboots') && !gasIds.has('cottonshoes'), 'T4c 加油站仅武器池不含鞋子');

  // ===== T5 百科与工坊页收录 =====
  assert(html.includes('雨靴') && html.includes('棉鞋'), 'T5 装备图鉴含雨靴/棉鞋');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
