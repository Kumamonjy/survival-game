/* V186 新劫掠者敌人「酒鬼」（250/55/10/射程2，暴击10%/180%）：技能投掷燃烧瓶（复刻玩家燃烧瓶 aoe：十字5格 40点+燃烧2+火焰2，敌我不分），CD4 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkB(units){
  return { units, selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, fires:{} };
}

(async () => {
  // ===== T1 定义 =====
  const DK = DATA.ZOMBIES.raider_drunk;
  const db = DK.base;
  assert(db.maxHp===250 && db.atk===55 && db.def===10 && db.range===2 && db.move===3, 'T1a 酒鬼：250/55/10/射程2/移速3');
  assert(db.critRate===10 && db.critDmg===180, 'T1b 暴击 10% / 暴伤 180%');
  assert(DK.species==='raider' && DK.exp===28 && DK.gold[0]===6 && DK.gold[1]===9, 'T1c 劫掠者种类 / 经验28 / 赏金6-9');

  // ===== T2 技能：复刻玩家燃烧瓶（CD4 / 无消耗）=====
  const bs = DATA.EQUIPS.molotov.skill, ds = DK.skills[0];
  assert(ds.name==='投掷燃烧瓶' && ds.shape==='aoe' && ds.range===2 && ds.area===1, 'T2a 投掷燃烧瓶：十字 5 格（2 格射程）');
  assert(ds.fixedDmg===40 && ds.burn && ds.burn.turns===2 && ds.fire && ds.fire.turns===2 && ds.hitsAll===true, 'T2b 40 点伤害 + 燃烧 2 + 火焰 2 + 敌我不分');
  assert(ds.cost===0 && ds.cd===4, 'T2c 敌方版无消耗 / CD 4');
  assert(bs && bs.fixedDmg===ds.fixedDmg && bs.burn.turns===ds.burn.turns && bs.fire.turns===ds.fire.turns, 'T2d 与玩家燃烧瓶参数对齐');

  // ===== T3 AI 施放：AOE 伤害 + 燃烧 + 火焰残留 =====
  Battle.b = mkB([]);
  const dk = Battle.mkZombie('raider_drunk', 5, 5, 1);
  dk.critRate = 0;
  Battle.b.units.push(dk);
  const p1 = Battle.mkAlly({ uid:'p1', name:'幸存者', cls:'civilian', level:1, exp:0, av:'🧍',
    hp:250, maxHp:250, stamina:100, maxStamina:100, atk:20, def:5, range:1, move:3, critRate:0, critDmg:150 }, 5, 6);
  Battle.b.units.push(p1);
  const cast = Battle.aiSkillDamage(dk, ds, [p1]);
  assert(cast && cast.shape==='aoe' && cast.total>0, 'T3a AI 评估投掷燃烧瓶');
  const hp0 = p1.hp;
  await Battle.aiExecuteZombie(dk, { type:'skill', sk:ds, cast });
  const dmg = hp0 - p1.hp;
  assert(dmg===40 || dmg===35, `T3b 十字中心格伤害 = 40 点固定（含减防则 35，实际 ${dmg}）`);
  assert(p1.sts && p1.sts.burn && p1.sts.burn.t===2, 'T3c 玩家陷入燃烧 2 回合');
  assert(Object.keys(Battle.b.fire||{}).length>0, 'T3d 落点残留火焰');
  assert(dk.cds['投掷燃烧瓶']===4, 'T3e 进入 CD 4');

  // ===== T4 地图投放 =====
  const zone = id => DATA.ZONES.find(z=>z.id===id);
  const street = zone('street'), base = zone('base');
  const poolSum = z => Object.values(z.pool).reduce((a,b)=>a+b,0);
  assert(street.pool.raider_drunk===6 && base.pool.raider_drunk===7, 'T4a 商业街 6% / 军事基地 7%');
  assert(poolSum(street)===100 && poolSum(base)===100, 'T4b 两图敌人池权重各合计 100');
  assert(!zone('market').pool.raider_drunk && !zone('hospital').pool.raider_drunk, 'T4c d1/d2 地图不出现酒鬼');

  // ===== T5 wiki 收录 =====
  UI.wikiTab='enemy'; UI.openWiki();
  const eh = elems['wiki-content'].innerHTML;
  assert(eh.includes('酒鬼') && eh.includes('🍾') && eh.includes('投掷燃烧瓶'), 'T5 敌人图鉴劫掠者分组含酒鬼');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
