/* V243 毒刺丧尸（高阶）：HP200/攻70/防10/移3/射3/暴10%/暴伤180%；技能「毒刺飞射」直线3格 80% 穿刺伤害+中毒2回合，CD4；
   分布：所有 3★+ 区域（工厂 5 / 商业街 4 / 军事基地 6），百科敌人图鉴自动收录 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const Z = id => DATA.ZONES.find(z=>z.id===id);

(async () => {
  // ===== T1 定义 =====
  const S = DATA.ZOMBIES.sting;
  assert(S && S.name==='毒刺丧尸' && S.icon==='🦂', 'T1a 毒刺丧尸定义（高阶变异体）');
  assert(S.base.maxHp===200 && S.base.atk===70 && S.base.def===10 && S.base.move===3 && S.base.range===3, 'T1b 200❤️/70⚔️/10🛡️/移3/射3');
  assert(S.base.critRate===10 && S.base.critDmg===180, 'T1c 暴击率 10% / 暴伤 180%');
  const sk = S.skills && S.skills[0];
  assert(sk && sk.name==='毒刺飞射' && sk.shape==='line' && sk.lineLen===3 && sk.mult===0.8 && sk.cd===4 && sk.cost===0, 'T1d 毒刺飞射：直线 3 格 80% 无消耗 CD4');
  assert(sk.poison && sk.poison.turns===2, 'T1e 命中附加中毒 2 回合');
  assert(S.exp===24 && S.gold[0]===5 && S.gold[1]===8, 'T1f 击杀经验 24 / 赏金 5~8💰');

  // ===== T2 mkZombie 派生：Lv1 = 基础值，Lv3 = +20% =====
  const z1 = Battle.mkZombie('sting', 5, 5, 1);
  assert(z1.maxHp===200 && z1.atk===70 && z1.def===10 && z1.range===3 && z1.move===3 && z1.critRate===10 && z1.critDmg===180, 'T2a Lv1 属性 = 基础值');
  const z3 = Battle.mkZombie('sting', 5, 6, 3);
  assert(z3.maxHp===240 && z3.atk===84 && z3.def===12, 'T2b Lv3 = 基础值 +20%（240/84/12）');
  assert(z3.skills.length===1 && z3.skills[0].name==='毒刺飞射', 'T2c 技能随单位派生');

  // ===== T3 分布：仅 3★+ 区域（厂5/街4/基6），d1/d2 区域无 =====
  assert(Z('factory').pool.sting===5 && Z('street').pool.sting===4 && Z('base').pool.sting===6, 'T3a 厂5/街4/基6 权重');
  assert(!Z('market').pool.sting && !Z('gas').pool.sting && !Z('forest').pool.sting && !Z('camp').pool.sting && !Z('hospital').pool.sting, 'T3b 超市/加油站/林场/营地/医院（d1-2）不出现');
  const saw = { factory:0, street:0, base:0 };
  const c = Game.createChar('soldier','兵',false); g.chars.push(c); UI.teamSelected = [c.id];
  for (let i=0;i<120;i++){ await Battle.start(Z('factory')); if (Battle.b.units.some(x=>x.zombieType==='sting')) saw.factory++; }
  for (let i=0;i<120;i++){ await Battle.start(Z('street')); if (Battle.b.units.some(x=>x.zombieType==='sting')) saw.street++; }
  for (let i=0;i<120;i++){ await Battle.start(Z('base')); if (Battle.b.units.some(x=>x.zombieType==='sting')) saw.base++; }
  assert(saw.factory>0 && saw.street>0 && saw.base>0, `T3c 三区域均可遭遇毒刺丧尸（厂 ${saw.factory}/街 ${saw.street}/基 ${saw.base} /120 场）`);

  // ===== T4 技能实战：直线 3 格双目标 80% 伤害 + 中毒 2 回合，进入 CD4 =====
  // 摆位：丧尸贴左边界 [5,1]，双目标成一直线 [5,2][5,3]——后撤无路、站定施放为唯一最优
  const u1 = Battle.mkAlly(c, 5, 2);
  const c2 = Game.createChar('civilian','医',false); g.chars.push(c2);
  const u2 = Battle.mkAlly(c2, 5, 3);
  u1.def = 0; u2.def = 0;   // 归零防御：56 = 70×80%
  const sz = Battle.mkZombie('sting', 5, 1, 1);
  sz.critRate = 0;   // 清零暴击：伤害确定化（56 = 70×80%，普攻 70），评估毒价值 112+2×40=192 > 普攻 70 稳定择优
  Battle.b = { units:[u1, u2, sz], selected:u1, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:Z('factory'), doubledReward:false, pendingSkill:null, targetMode:null };
  const allies = Battle.b.units.filter(x=>x.side==='ally' && x.hp>0);
  const plan = Battle.aiPlanZombie(sz, allies);
  assert(plan && plan.act.type==='skill' && plan.act.sk.name==='毒刺飞射', `T4-0 AI 择优施放毒刺飞射（${plan && plan.act.type}）`);
  const h1 = u1.hp, h2 = u2.hp;
  await Battle.zombieAct(sz);
  const d1 = h1-u1.hp, d2 = h2-u2.hp;
  assert(d1===56 && d2===56, `T4a 直线双目标各受 56 = 70×80%（实际 ${d1}/${d2}）`);
  assert(u1.sts.poison && u1.sts.poison.t===2 && u2.sts.poison && u2.sts.poison.t===2, 'T4b 双目标陷入中毒 2 回合');
  assert(sz.cds['毒刺飞射']===4, `T4c 技能进入 CD4`);
  assert(Battle.b.log.some(e=>e.msgs && e.msgs.some(x=>x.m && x.m.includes('毒刺飞射'))), 'T4d 战斗记录含技能名');

  // ===== T5 CD 期间转普攻（单目标、无附加中毒） =====
  u1.sts = {}; u2.sts = {};
  u1.hp = u1.maxHp; u2.hp = u2.maxHp;
  sz.row = 5; sz.col = 1;
  const h3 = u1.hp;
  await Battle.zombieAct(sz);
  const victims = (u1.maxHp-u1.hp>0) + (u2.maxHp-u2.hp>0);
  assert(victims===1, `T5a CD 期间普攻仅 1 个目标（实际 ${victims}）`);
  assert(!(u1.sts.poison) && !(u2.sts.poison), 'T5b 普攻不附加中毒');

  // ===== T6 直线外目标不受影响 =====
  u1.sts = {}; u2.sts = {}; u1.hp = u1.maxHp; u2.hp = u2.maxHp;
  sz.cds = {};
  const u3 = Battle.mkAlly(Game.createChar('soldier','三',false), 8, 8);
  g.chars.push(u3.char || c); Battle.b.units.push(u3);
  const h8 = u3.hp;
  await Battle.zombieAct(sz);
  assert(u3.hp===h8 && !(u3.sts && u3.sts.poison), 'T6 直线外单位无伤无毒');
  // 清理：让 B 不再参与后续
  Battle.b.units = Battle.b.units.filter(x=>x!==u3);

  // ===== T7 击杀赏金按图鉴区间 =====
  const gb = Battle.rollKillGold('sting');
  assert(gb>=5 && gb<=8, `T7 击杀赏金 5~8💰（${gb}）`);

  // ===== T8 百科敌人图鉴自动收录 =====
  UI.wikiTab='enemy'; UI.openWiki();
  const wiki = elems['wiki-content'].innerHTML;
  assert(wiki.includes('毒刺丧尸') && wiki.includes('毒刺飞射') && wiki.includes('200'), 'T8 百科丧尸图鉴含毒刺丧尸与毒刺飞射');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
