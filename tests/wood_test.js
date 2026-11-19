/* V101 新资源「木材」🪵：新档初始化 / 旧档迁移 / 区域产出 / 物资箱与废墟拾取 / 资源栏与百科展示 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
let g = Game.g;

(async () => {
  // T1 新档初始化
  assert(g.res.wood===3, 'T1a 新档木材初始 3');
  assert(UI.resIcon('wood')==='🪵', 'T1b resIcon 木材 🪵');

  // T2 区域产出：factory/street 副产出含木材，其余区域不含
  const fz = DATA.ZONES.find(z=>z.id==='factory'), sz = DATA.ZONES.find(z=>z.id==='street');
  assert(fz && Array.isArray(fz.sub.wood) && fz.sub.wood[0]===1 && fz.sub.wood[1]===3, 'T2a 工厂副产出 木材 1-3');
  assert(sz && Array.isArray(sz.sub.wood) && sz.sub.wood[0]===1 && sz.sub.wood[1]===2, 'T2b 商业街副产出 木材 1-2');
  assert(DATA.ZONES.filter(z=>z.sub.wood).length===2, 'T2c 仅 2 个区域产出木材');
  assert(fz.terrain && sz.terrain, 'T2d 地形配方不受影响');

  // T3 旧档迁移：res 缺 wood 字段 → applySave 后补 0
  const oldChar = Game.createChar('civilian', '老平民', false);
  const oldSave = { v:1, ts:Date.now(), day:2, uid:7000, state:{ day:2, weather:'sunny', res:{gold:50,med:1,metal:0,food:30,fabric:0}, chars:[oldChar], seenMilestones:[] } };
  store['doomcity_save_1'] = JSON.stringify(oldSave);
  const loaded = Game.loadFromSlot(1);
  Game.applySave(loaded, 1);
  assert(Game.g.res.wood===0 && Game.g.res.gold===50, 'T3 旧档迁移补 wood=0（其余资源不变）');
  Game.g = Game.newGame(); Game.currentSlot = 1; g = Game.g;

  // T4 资源入库 + 主界面资源栏渲染
  g.res.wood = 0;
  Game.addRes('wood', 7);
  assert(g.res.wood===7, 'T4a addRes 木材 +7');
  UI.renderHome();
  assert(elems['res-wood'] && String(elems['res-wood'].textContent)==='7', 'T4b 资源栏显示木材 7');

  // T5 战斗物资箱拾取木材（多次开箱必含 wood 且无 NaN）
  const u = Battle.mkAlly(g.chars[0], 3, 3);
  Battle.b = { units:[u], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    ruins:{}, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, mode:null, turn:1, phase:'player', weather:'sunny',
    stats:{}, log:[], logEl:null, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  let sawWood = false;
  for (let i=0;i<60;i++) {
    Battle.b.terrain[3][3] = 'crate';
    u.hasMoved = false;
    await Battle.doMove(u, 3, 3);
    if (Battle.b.loot.wood > 0) sawWood = true;
    u.row = 3; u.col = 3;
  }
  assert(sawWood, 'T5a 60 次开箱中出现木材');
  assert(Object.values(Battle.b.loot).every(v=>Number.isFinite(v)), 'T5b loot 全字段有限值（无 NaN）');

  // T6 废墟翻找木材
  Battle.b.terrain[2][2] = 'ruin'; Battle.b.ruins['2,2'] = 1;
  u.row = 2; u.col = 3; u.hasMoved = true; u.hasAttacked = false;
  const before = Battle.b.loot.wood;
  await Battle.searchRuin(u, 2, 2);
  assert(Number.isFinite(Battle.b.loot.wood) && Battle.b.loot.wood >= before, 'T6 废墟翻找木材正常入账');

  // T7 百科物资面板含木材
  UI.openInv && UI.openInv();
  const invHtml = elems['inv-list'] ? elems['inv-list'].innerHTML : '';
  assert(invHtml.includes('🪵') && invHtml.includes('木材'), 'T7 物资面板显示木材');

  // T8 百科装备图鉴木材配方显示（V105 修复 craftMap 漏 wood）
  UI.wikiTab = 'equip'; UI.openWiki();
  const eqHtml = elems['wiki-content'] ? elems['wiki-content'].innerHTML : '';
  assert(eqHtml.includes('5🪵') && eqHtml.includes('20💰 + 5🪵'), 'T8 装备图鉴显示木棍配方 20💰 + 5🪵');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
