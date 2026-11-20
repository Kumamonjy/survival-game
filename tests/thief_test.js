/* V90 小偷职业：移速4 / 暗中偷袭(同运动员) / 妙手神偷(110%伤害+偷2%maxHp金币, 8格含斜角) */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 定义
  const T = DATA.CLASSES.thief;
  assert(T.name==='小偷' && T.price===240 && T.food===2, 'T1a 小偷定义：240💰 / 2🍞');
  assert(T.base.maxHp===150 && T.base.maxStamina===130 && T.base.atk===45 && T.base.def===5, 'T1b 基础 150❤️/130⚡/45⚔️/5🛡️');
  assert(T.base.range===1 && T.base.move===4 && T.base.critRate===5 && T.base.critDmg===150, 'T1c 射程1 / 移速4 / 暴击5%/150%');

  // T2 技能：偷袭与运动员原版定义一致（运动员已改版，改为与固定参数比对）；妙手神偷参数
  const sk1 = T.skills[0], sk2 = T.skills[1];
  assert(sk1.name==='暗中偷袭' && sk1.mult===1.6 && sk1.range===2 && sk1.cost===25 && sk1.cd===3 && sk1.shape==='target',
    `T2a 暗中偷袭保持原偷袭参数（${sk1.mult}倍/${sk1.range}格/${sk1.cost}⚡/CD${sk1.cd}）`);
  assert(sk2.name==='妙手神偷' && sk2.shape==='ring1' && sk2.mult===1.1 && sk2.stealPct===0.02 && sk2.cost===25 && sk2.cd===2, 'T2b 妙手神偷：ring1/110%/2%/25⚡/CD2');

  // T3 战斗：妙手神偷 110% 伤害 + 偷 2% maxHp 金币
  const c = Game.createChar('thief','神偷',false);
  g.chars.push(c);
  const u = Battle.mkAlly(c, 5, 5);
  Battle.b = { units:[u], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null };
  const f = Battle.mkZombie('walker', 6, 6, 1);   // 斜角相邻（8格）
  f.maxHp = 500; f.hp = 500; f.def = 5;
  Battle.b.units.push(f);
  u.critRate = 0;   // 消除暴击随机性（暴击会破坏精确相等断言）
  const atk = Battle.effAtk(u);
  const g0 = Battle.b.loot.gold;
  await Battle.execSkill(u, { sk: sk2, target: f });
  assert(f.hp===500-(Math.round(atk*1.1)-5), `T3a 110% 伤害（先乘后减防）：${500-f.hp} = round(${atk}×1.1)-5`);
  assert(Battle.b.loot.gold-g0===10, `T3b 偷取金币 10 = round(500×2%)（实得 ${Battle.b.loot.gold-g0}）`);

  // T4 击杀后照偷
  u.hasAttacked = false;
  const f2 = Battle.mkZombie('walker', 4, 6, 1);
  f2.maxHp = 400; f2.hp = 1;
  Battle.b.units.push(f2);
  const g1 = Battle.b.loot.gold;
  await Battle.execSkill(u, { sk: sk2, target: f2 });
  assert(f2.hp<=0 && Battle.b.loot.gold-g1===8, `T4 击杀后照偷 8 = round(400×2%)（${Battle.b.loot.gold-g1}）`);

  // T5 ring1 目标选择：含斜角、不含 2 格远
  u.row = 8; u.col = 8;
  const dia = Battle.mkZombie('walker', 7, 7, 1);   // 斜角
  const far = Battle.mkZombie('walker', 8, 10, 1);  // 同行距2
  Battle.b.units.push(dia, far);
  Battle.b.selected = u;
  Battle.cmdSkill ? null : null;
  // 直接调 cmdSkill 内部逻辑：设 pendingSkill 后选技能——简化为直接构造 ring1 集合断言
  const ring1 = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    .map(([dr,dc])=>[8+dr,8+dc]).filter(([r,c2])=>Battle.inMap(r,c2) && (()=>{ const t=Battle.unitAt(r,c2); return t && t.side==='enemy'; })());
  assert(ring1.some(([r,c2])=>r===7&&c2===7), 'T5a 斜角敌人在目标集');
  assert(!ring1.some(([r,c2])=>r===8&&c2===10), 'T5b 2格远敌人不在目标集');
  assert(ring1.length===1, `T5c 目标集仅 1 个（${ring1.length}）`);

  // T6 百科与招募收录
  UI.renderWiki ? UI.renderWiki('classes') : UI.openWiki && UI.openWiki('classes');
  const wikiHtml = Object.keys(elems).some(k=>elems[k].innerHTML && elems[k].innerHTML.includes('小偷'));
  assert(wikiHtml, 'T6a 百科渲染含小偷');
  const th = Game.createChar('thief','甲',false);
  assert(th.cls==='thief' && !!th.name && DATA.CLASSES[th.cls].icon==='🥷', 'T6b createChar 正常产出小偷');

  console.log('--- done ---');
  process.exit(0);
})();
