/* V108 新职业赌徒：基础属性/暴伤170%/孤注一掷随机倍率/一掷千金双目标+金币消耗/选择流程 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

const mkB = () => { Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
  mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false }; };
const SK1 = () => DATA.CLASSES.gambler.skills.find(s=>s.name==='孤注一掷');
const SK2 = () => DATA.CLASSES.gambler.skills.find(s=>s.name==='一掷千金');

(async () => {
  // T1 职业定义
  const G = DATA.CLASSES.gambler, B = G.base;
  assert(B.maxHp===200 && B.maxStamina===100 && B.atk===40 && B.def===5 && B.move===3 && B.range===1 && B.critRate===5 && B.critDmg===170, 'T1a 赌徒基础属性（暴伤 170%）');
  assert(G.skills.length===2 && G.price>0 && G.food===2, 'T1b 双职业技能 + 招募价/口粮');

  // T2 建角 → 暴伤 170 进角色字段
  const gc = Game.createChar('gambler','赌侠');
  gc.talents = [];   // 排除随机天赋（鹰眼/懦弱会改暴伤）
  Game.applyTalents(gc); Game.recalc(gc);
  assert(gc.critDmg===170 && gc.critRate===5 && gc.maxHp===200, 'T2 createChar 暴伤 170 生效');

  // T3 孤注一掷：随机倍率边界（0.2→80%，0.8→170%），扣 15⚡ 进 CD2
  mkB();
  const u = Battle.mkAlly(gc, 5, 5);
  Battle.b.units.push(u); Battle.b.selected = u;
  const f1 = Battle.mkZombie('walker', 5, 6, 1);
  Battle.b.units.push(f1);
  const realRandom = Math.random;
  Math.random = () => 0.2;   // 倍率 0.8，无暴击（20<5 不成立）
  const hpA = f1.maxHp;
  await Battle.execSkill(u, { sk:SK1(), target:f1 });
  const dmgLow = hpA - f1.hp;
  f1.hp = f1.maxHp; u.hasAttacked = false; u.cds = {}; u.stamina = u.maxStamina;
  Math.random = () => 0.8;   // 倍率 1.7
  await Battle.execSkill(u, { sk:SK1(), target:f1 });
  const dmgHigh = hpA - f1.hp;
  Math.random = realRandom;
  assert(dmgLow>0 && dmgHigh>dmgLow && Math.abs((dmgHigh-dmgLow) - 40*0.9) <= 2, `T3a 随机倍率 50%~200% 生效（低 ${dmgLow} / 高 ${dmgHigh}，差 ${dmgHigh-dmgLow}≈36）`);
  assert(u.stamina===u.maxStamina-15 && Battle.skCd(u,SK1())===2, `T3b 扣 15⚡、进 CD2（⚡${u.maxStamina-u.stamina}）`);

  // T4 一掷千金：双目标齐射、扣 10💰+35⚡、各自独立掷骰
  g.res.gold = 100;
  u.stamina = u.maxStamina; u.cds = {}; u.hasAttacked = false;
  const f2 = Battle.mkZombie('walker', 5, 4, 1);
  Battle.b.units.push(f2);
  const h1 = f1.maxHp, h2 = f2.maxHp;
  await Battle.execSkill(u, { sk:SK2(), targets:[f1,f2] });
  assert(g.res.gold===90, `T4a 扣 10 金币（${g.res.gold}）`);
  assert(f1.hp<h1 && f2.hp<h2 && (h1-f1.hp)!==(h2-f2.hp), `T4b 双目标命中且独立掷骰（${h1-f1.hp}/${h2-f2.hp}）`);
  assert(u.stamina===u.maxStamina-35 && Battle.skCd(u,SK2())===2, 'T4c 扣 35⚡、进 CD2');

  // T5 金币不足拦截：不扣体力、不进 CD、不施放
  g.res.gold = 5; u.stamina = u.maxStamina; u.cds = {}; u.hasAttacked = false; Battle.b.selected = u;
  Battle.pickSkill(1);
  assert(!Battle.b.pendingSkill && u.stamina===u.maxStamina && !Battle.skCd(u,SK2()), 'T5 金币不足时 pickSkill 被拦截');

  // T6 target2 选择流程：首点锁定不结算，再点另一目标齐射；同一点两次=单独施放
  g.res.gold = 100; u.stamina = u.maxStamina; u.cds = {}; u.hasAttacked = false;
  f1.hp = f1.maxHp; f2.hp = f2.maxHp;
  Battle.b.mode='skill'; Battle.b.targetMode='target2'; Battle.b.pendingSkill=SK2(); Battle.b.multiTargets=[];
  Battle.b.targetSet=[[f1.row,f1.col],[f2.row,f2.col]];
  await Battle.cellClick(f1.row, f1.col);
  assert(Battle.b.multiTargets.length===1 && f1.hp===f1.maxHp && g.res.gold===100, 'T6a 首点仅锁定、未结算');
  await Battle.cellClick(f2.row, f2.col);
  assert(f1.hp<f1.maxHp && f2.hp<f2.maxHp && g.res.gold===90, 'T6b 二次点击齐射：双目标受伤、扣 10💰');
  g.res.gold = 100; u.stamina = u.maxStamina; u.cds = {}; u.hasAttacked = false;
  f1.hp = f1.maxHp; f2.hp = f2.maxHp;
  Battle.b.mode='skill'; Battle.b.targetMode='target2'; Battle.b.pendingSkill=SK2(); Battle.b.multiTargets=[];
  Battle.b.targetSet=[[f1.row,f1.col],[f2.row,f2.col]];
  await Battle.cellClick(f1.row, f1.col);
  await Battle.cellClick(f1.row, f1.col);
  assert(f1.hp<f1.maxHp && f2.hp===f2.maxHp && g.res.gold===90, 'T6c 同一目标点两次=单独施放，另一目标不受波及');

  // T7 百科职业表收录
  UI.wikiTab='cls'; UI.openWiki();
  const wh = elems['wiki-content'] ? elems['wiki-content'].innerHTML : '';
  assert(wh.includes('赌徒') && wh.includes('🎲'), 'T7 百科职业表收录赌徒');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
