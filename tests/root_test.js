/* V185 新战斗状态「禁锢」（root：无法移动，可攻击/技能/休息）+ 新敌人绑匪（raider 类，技能绑架：1格 120%+禁锢1回合 CD3） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkB(units){
  return { units, selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, fires:{} };
}
const mkA = (name,uid,r,c) => Battle.mkAlly({ uid, name, cls:'civilian', level:1, exp:0, av:'🧍',
  hp:250, maxHp:250, stamina:100, maxStamina:100, atk:20, def:5, range:1, move:3, critRate:0, critDmg:150 }, r, c);

(async () => {
  // ===== T1 状态注册 =====
  const R = DATA.STATUSES.root;
  assert(R && R.name==='禁锢' && R.icon==='⛓️' && R.bad, 'T1a 禁锢状态注册（⛓️ 负面状态）');
  assert(R.desc.includes('无法移动') && R.desc.includes('攻击'), 'T1b 描述：无法移动但可攻击/技能/休息');

  // ===== T2 绑匪定义 =====
  const SN = DATA.ZOMBIES.raider_snatcher;
  const sb = SN.base;
  assert(sb.maxHp===180 && sb.atk===40 && sb.def===5 && sb.range===1 && sb.move===3, 'T2a 绑匪：180/40/5/射程1/移速3');
  assert(sb.critRate===5 && sb.critDmg===150, 'T2b 绑匪：暴击 5% / 暴伤 150%');
  assert(SN.species==='raider', 'T2c 绑匪属劫掠者种类');
  const kidn = SN.skills[0];
  assert(kidn.name==='绑架' && kidn.shape==='target' && kidn.range===1, 'T2d 绑架：1 格单体');
  assert(kidn.mult===1.2 && kidn.root && kidn.root.turns===1, 'T2e 绑架：120% 攻 + 禁锢 1 回合');
  assert(kidn.cost===0 && kidn.cd===3, 'T2f 无消耗 / CD 3');

  // ===== T3 玩家禁锢：移动被拒、攻击可用 =====
  Battle.b = mkB([]);
  const p1 = mkA('幸存者','p1',5,5);
  Battle.b.units.push(p1); Battle.b.selected = p1;
  Battle.cmdMove();
  assert(Battle.b.mode==='move', 'T3a 正常状态可进入移动模式');
  Battle.b.mode = null;
  Battle.applyStatus(p1, 'root', 1, 'x1');
  Battle.cmdMove();
  assert(Battle.b.mode!=='move', 'T3b 禁锢后点「移动」被拒绝');
  const tgt = Battle.mkZombie('walker', 5, 6, 1); Battle.b.units.push(tgt);   // 攻击范围内放一个敌人
  Battle.cmdAttack();
  assert(Battle.b.mode==='attack', 'T3c 禁锢后攻击不受影响');
  Battle.b.mode = null;

  // ===== T4 敌 AI 禁锢：只评估原地 =====
  Battle.b = mkB([]);
  const z = Battle.mkZombie('walker', 5, 5, 1);
  Battle.applyStatus(z, 'root', 2, 'x1');
  Battle.b.units.push(z);
  const p2 = mkA('诱饵','p2',5,8);
  Battle.b.units.push(p2);
  const plan = Battle.aiPlanZombie(z, [p2]);
  assert(plan===null || (plan.r===z.row && plan.c===z.col), 'T4a 被禁锢的敌人不移动（仅原地攻击/技能）');

  // ===== T5 AI 施放绑架：伤害 + 禁锢 =====
  Battle.b = mkB([]);
  const sn = Battle.mkZombie('raider_snatcher', 5, 5, 1);
  sn.critRate = 0;   // 固定不暴击
  Battle.b.units.push(sn);
  const p3 = mkA('人质','p3',5,6);
  Battle.b.units.push(p3);
  const cast = Battle.aiSkillDamage(sn, kidn, [p3]);
  assert(cast && cast.shape==='target' && cast.total>0, 'T5a AI 评估绑架');
  const hp0 = p3.hp;
  await Battle.aiExecuteZombie(sn, { type:'skill', sk:kidn, cast });
  const expDmg = Math.max(1, Math.round(sn.atk*1.2) - p3.def);
  assert(p3.hp===hp0-expDmg, `T5b 绑架伤害 = 120% 攻 - 防（-${expDmg}）`);
  assert(p3.sts && p3.sts.root && p3.sts.root.t===1, 'T5c 玩家被禁锢 1 回合');
  assert(sn.cds['绑架']===3, 'T5d 绑架进入 CD 3');

  // ===== T6 地图投放 =====
  const zone = id => DATA.ZONES.find(z=>z.id===id);
  const street = zone('street'), base = zone('base');
  const poolSum = z => Object.values(z.pool).reduce((a,b)=>a+b,0);
  assert(street.pool.raider_snatcher===6 && base.pool.raider_snatcher===6, 'T6a 商业街/军事基地各混入绑匪 6%');
  assert(poolSum(street)===100 && poolSum(base)===100, 'T6b 两图敌人池权重各合计 100');
  assert(!zone('market').pool.raider_snatcher && !zone('hospital').pool.raider_snatcher, 'T6c d1/d2 地图不出现绑匪');

  // ===== T7 wiki：状态表与敌人图鉴 =====
  UI.wikiTab='status'; UI.openWiki();
  const sh = elems['wiki-content'].innerHTML;
  assert(sh.includes('禁锢') && sh.includes('无法移动'), 'T7a 百科战斗状态表含禁锢');
  UI.wikiTab='enemy'; UI.openWiki();
  const eh = elems['wiki-content'].innerHTML;
  assert(eh.includes('绑匪') && eh.includes('绑架') && eh.includes('🪢'), 'T7b 敌人图鉴劫掠者分组含绑匪');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
