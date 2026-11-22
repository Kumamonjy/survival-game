/* V192 劫掠者新敌人「劫掠枪手」🎯：HP220/攻70/防10/移3/射程3/暴击10%/暴伤180%，远程点杀脆皮，投放野外营地(16%)/商业街(5%)/军事基地(5%) */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定义：用户指定属性 =====
  const G = DATA.ZOMBIES.raider_gunner;
  assert(G && G.name==='劫掠枪手' && G.icon==='🎯', 'T1a 劫掠枪手注册（🎯 图标）');
  assert(G.species==='raider', 'T1b 种类 = 劫掠者');
  assert(G.base.maxHp===220 && G.base.atk===70 && G.base.def===10, 'T1c 生命 220 / 攻击 70 / 防御 10');
  assert(G.base.move===3 && G.base.range===3, 'T1d 移速 3 / 射程 3');
  assert(G.base.critRate===10 && G.base.critDmg===180, 'T1e 暴击率 10% / 暴击伤害 180%');
  assert(!G.skills && !G.skill, 'T1f 无主动技能（远射普攻即特色，同劫匪无技能）');

  // ===== T2 mkZombie 生成：基础值与成长 =====
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, fires:{}, ice:{} };
  const z1 = Battle.mkZombie('raider_gunner', 5, 5, 1);
  assert(z1.hp===220 && z1.maxHp===220 && z1.atk===70 && z1.def===10, 'T2a 1 级属性 = 基础值');
  assert(z1.range===3 && z1.move===3 && z1.critRate===10 && z1.critDmg===180, 'T2b 射程 3 / 移速 3 / 暴击 10%·180%');
  const z2 = Battle.mkZombie('raider_gunner', 5, 6, 2);
  assert(z2.hp===242 && z2.atk===77 && z2.def===11, 'T2c 2 级成长 +10%（生命 242/攻 77/防 11）');
  assert(z1.side==='enemy' && z1.icon==='🎯', 'T2d 敌方单位图标 🎯');

  // ===== T3 射程 3 远程点杀：3 格外直接开枪，无需移动 =====
  z1.critRate = 0;   // 固定不暴击，排除随机性
  const p1 = Battle.mkAlly({ uid:'p1', name:'幸存者', cls:'civilian', level:1, exp:0, av:'🧍',
    hp:300, maxHp:300, stamina:100, maxStamina:100, atk:20, def:10, range:1, move:3, critRate:0, critDmg:150 }, 5, 2);
  Battle.b.units.push(p1);
  const hp0 = p1.hp;
  await Battle.zombieAct(z1);
  assert(p1.hp===hp0-60, `T3a 3 格外开枪 = 攻 70 - 防 10（-60，实际 -${hp0-p1.hp}）`);
  assert(z1.row===5 && z1.col===5, 'T3b 射程内原地开枪不移动');
  const cells = Battle.attackCells(z1).map(([r,c])=>r+','+c);
  assert(cells.includes('5,2') && cells.includes('2,5'), 'T3c 攻击范围覆盖 3 格（切比雪夫距离）');

  // ===== T4 地图投放：营地 16% / 商业街 5% / 军事基地 5%，各池合计 100 =====
  const zone = id => DATA.ZONES.find(z=>z.id===id);
  const poolSum = z => Object.values(z.pool).reduce((a,b)=>a+b,0);
  const camp = zone('camp'), street = zone('street'), base = zone('base');
  assert(camp.pool.raider_gunner===16, 'T4a 野外营地 16%（金枪手/酒鬼下调腾出权重）');
  assert(street.pool.raider_gunner===5 && base.pool.raider_gunner===5, 'T4b 商业街 5% / 军事基地 5%');
  assert(poolSum(camp)===100 && poolSum(street)===100 && poolSum(base)===100, 'T4c 三图池权重各合计 100');
  assert(!zone('market').pool.raider_gunner && !zone('hospital').pool.raider_gunner && !zone('factory').pool.raider_gunner, 'T4d 其余地图不出现枪手');
  UI.teamSelected = g.chars.slice(0,1).map(c=>c.id);
  await Battle.start(camp);
  const types = new Set(Battle.b.units.filter(u=>u.side==='enemy').map(u=>u.zombieType));
  assert([...types].every(t=>['raider_mug','raider_thug','raider_snatcher','raider_drunk','raider_gunner'].includes(t)), 'T4e 营地实战生成全为劫掠者');

  // ===== T5 wiki 收录：敌人图鉴劫掠者分组 + 地图页概率 =====
  UI.wikiTab='enemy'; UI.openWiki();
  const wiki = elems['wiki-content'].innerHTML;
  assert(wiki.includes('劫掠枪手') && wiki.includes('🎯'), 'T5a 敌人图鉴收录劫掠枪手');
  const rowIdx = wiki.indexOf('劫掠枪手');
  assert(rowIdx > wiki.indexOf('🍾 酒鬼') && rowIdx < wiki.length-10, 'T5b 归入劫掠者分组（酒鬼之后）');
  UI.wikiTab='map'; UI.openWiki();
  const mapWiki = elems['wiki-content'].innerHTML;
  assert(mapWiki.includes('🎯 劫掠枪手 16%') && mapWiki.includes('🎯 劫掠枪手 5%'), 'T5c 地图页敌情表展示枪手概率');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
