/* V184 敌人种类系统 + 新种类「劫掠者」：劫匪/暴徒（混入商业街/军事基地），暴徒技能击晕（1格 120%+眩晕1回合 CD3），wiki 敌人图鉴分组 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkB(units){
  return { units, selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, fires:{} };
}

(async () => {
  // ===== T1 种类标签全覆盖 =====
  const all = Object.values(DATA.ZOMBIES);
  assert(all.every(Z=>Z.species), 'T1a 所有敌人都有 species 标签');
  const zombies = all.filter(Z=>Z.species==='zombie');
  assert(zombies.length>=10, `T1b 丧尸类敌人 ${zombies.length} 种`);
  const raiders = all.filter(Z=>Z.species==='raider');
  assert(raiders.length===5 && raiders.every(Z=>['劫匪','暴徒','绑匪','酒鬼','劫掠枪手'].includes(Z.name)), 'T1c 劫掠者类 = 劫匪/暴徒/绑匪/酒鬼/劫掠枪手 5 种');

  // ===== T2 劫匪定义 =====
  const mug = DATA.ZOMBIES.raider_mug;
  const mb = mug.base;
  assert(mb.maxHp===220 && mb.atk===50 && mb.def===10 && mb.range===1 && mb.move===3, 'T2a 劫匪：220/50/10/射程1/移速3');
  assert(mb.critRate===5 && mb.critDmg===150, 'T2b 劫匪：暴击 5% / 暴伤 150%');
  assert(mug.exp===30 && mug.gold[0]===4 && mug.gold[1]===6, 'T2c 劫匪：经验 30 / 赏金 4-6（对标 d3）');
  assert(!mug.skills && !mug.skill, 'T2d 劫匪无技能');

  // ===== T3 暴徒定义 + 击晕 =====
  const thug = DATA.ZOMBIES.raider_thug;
  const tb = thug.base;
  assert(tb.maxHp===220 && tb.atk===55 && tb.def===10 && tb.range===1 && tb.move===3, 'T3a 暴徒：220/55/10/射程1/移速3');
  assert(tb.critRate===10 && tb.critDmg===180, 'T3b 暴徒：暴击 10% / 暴伤 180%');
  const stunSk = thug.skills[0];
  assert(stunSk.name==='击晕' && stunSk.shape==='target' && stunSk.range===1, 'T3c 击晕：1 格单体');
  assert(stunSk.mult===1.2 && stunSk.stun && stunSk.stun.turns===1, 'T3d 击晕：120% 攻 + 眩晕 1 回合');
  assert(stunSk.cost===0 && stunSk.cd===3, 'T3e 无消耗 / CD 3');

  // ===== T4 地图投放：混入商业街/军事基地 =====
  const zone = id => DATA.ZONES.find(z=>z.id===id);
  const poolSum = z => Object.values(z.pool).reduce((a,b)=>a+b,0);
  const street = zone('street'), base = zone('base');
  assert(street.pool.raider_mug===8 && street.pool.raider_thug===8, 'T4a 商业街含劫匪 8/暴徒 8');
  assert(base.pool.raider_mug===7 && base.pool.raider_thug===8, 'T4b 军事基地含劫匪 7/暴徒 8');
  assert(poolSum(street)===100 && poolSum(base)===100, 'T4c 两图敌人池权重各合计 100');
  assert(!zone('market').pool.raider_mug && !zone('hospital').pool.raider_thug, 'T4d d1/d2 地图不出现劫掠者');
  assert(street.desc.includes('劫掠者') && base.desc.includes('劫掠者'), 'T4e 地图描述提及劫掠者');

  // ===== T5 AI 击晕：评估→施放→眩晕 =====
  Battle.b = mkB([]);
  const th = Battle.mkZombie('raider_thug', 5, 5, 1);
  th.critRate = 0;   // 固定不暴击，伤害断言可精确计算
  Battle.b.units.push(th);
  const p1 = Battle.mkAlly({ uid:'p1', name:'幸存者', cls:'civilian', level:1, exp:0, av:'🧍',
    hp:250, maxHp:250, stamina:100, maxStamina:100, atk:20, def:5, range:1, move:2, critRate:0, critDmg:150 }, 5, 6);
  Battle.b.units.push(p1);
  const cast = Battle.aiSkillDamage(th, stunSk, [p1]);
  assert(cast && cast.shape==='target' && cast.total>0, 'T5a AI 评估击晕');
  const hp0 = p1.hp;
  await Battle.aiExecuteZombie(th, { type:'skill', sk:stunSk, cast });
  const expDmg = Math.max(1, Math.round(th.atk*1.2) - p1.def);
  assert(p1.hp===hp0-expDmg, `T5b 击晕伤害 = 120% 攻 - 防（-${expDmg}）`);
  assert(p1.sts && p1.sts.stun && p1.sts.stun.t===1, 'T5c 玩家被眩晕 1 回合');
  assert(th.cds['击晕']===3, 'T5d 击晕进入 CD 3');
  // 击杀赏金通用
  const bg = Battle.rollKillGold('raider_mug');
  assert(bg>=4 && bg<=6, 'T5e 劫匪击杀赏金在 4-6 区间');

  // ===== T6 wiki 敌人图鉴分组 =====
  UI.wikiTab = 'enemy'; UI.openWiki();
  const wh = elems['wiki-content'].innerHTML;
  assert(wh.includes('敌人图鉴') && !wh.includes('丧尸图鉴</h4>'), 'T6a 图鉴改名「敌人图鉴」');
  assert(wh.includes('🧟 丧尸') && wh.includes('🗡️ 劫掠者'), 'T6b 丧尸/劫掠者分组小节');
  assert(wh.includes('劫匪') && wh.includes('暴徒') && wh.includes('击晕'), 'T6c 劫匪/暴徒/击晕收录');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
