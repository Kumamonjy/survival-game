/* V166 指定类型技能统一函数：targetCells / castTargeted —— 所有「选 X 格内 X 目标造成 X 伤害」技能共用一条管线 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkBattle(myRow, myCol) {
  const b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null,
    loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, fire:{}, over:false,
    subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null, multiTargets:null };
  Battle.b = b;
  return b;
}

(async () => {
  // ===== T1 统一入口存在且文档化 =====
  assert(typeof Battle.targetCells==='function' && typeof Battle.castTargeted==='function' && typeof Battle.maxTargetsOf==='function',
    'T1a 统一入口：targetCells / castTargeted / maxTargetsOf');
  assert(html.includes('指定类型技能（统一入口）') && html.includes('castTargeted（合法性校验+施放）'), 'T1b schema 注释已文档化');

  // ===== T2 全库指定类型技能盘点（数据驱动，零散实现已清除） =====
  const targeted = [];
  const scanSk = sk => { if (sk && sk.type==='attack' && ['target','ring1','target2'].includes(sk.shape)) targeted.push(sk); };
  const scanObj = o => { if (!o) return; (o.skills||[]).forEach(scanSk); scanSk(o.skill); };
  Object.values(DATA.CLASSES||{}).forEach(scanObj);
  Object.values(DATA.EQUIPS).forEach(scanObj);
  Object.values(DATA.ZOMBIES).forEach(scanObj);
  assert(targeted.length >= 15, `T2a 全库指定类型技能 ≥15 个（实际 ${targeted.length}）`);
  targeted.forEach(sk=>{
    assert(sk.type==='attack' && (sk.mult||sk.fixedDmg||sk.randMult), `T2b「${sk.name}」带伤害字段（mult/fixedDmg/randMult 之一）`);
  });
  // 命中采样：各具特色的指定技能
  ['奋力一击','妙手神偷','孤注一掷','麻醉飞镖','注射毒药','棍棒打击','凶猛撕咬'].forEach(n=>{
    assert(targeted.some(s=>s.name===n), `T2c 技能池含「${n}」`);
  });

  // ===== T3 targetCells：单体射程 / 环形1圈 / 双目标 =====
  const c1 = Game.createChar('soldier','指一',false); g.chars.push(c1);
  const me = Battle.mkAlly(c1, 5, 5);
  mkBattle();
  const e1 = Battle.mkZombie('walker', 5, 7, 1);   // 距离2
  const e2 = Battle.mkZombie('runner', 6, 6, 1);   // 斜角1
  Battle.b.units.push(me, e1, e2);
  const skT = { name:'试作打击', cost:10, cd:2, type:'attack', shape:'target', mult:1.5, range:2 };
  const cellsT = Battle.targetCells(me, skT);
  assert(cellsT.some(([r,c])=>r===5&&c===7) && cellsT.some(([r,c])=>r===6&&c===6), 'T3a 射程内敌人均为可选格');
  assert(!cellsT.some(([r,c])=>r===5&&c===8), 'T3b 射程外不可选');
  const skR = { name:'试作环偷', cost:10, cd:2, type:'attack', shape:'ring1', mult:1.1 };
  const cellsR = Battle.targetCells(me, skR);
  assert(cellsR.some(([r,c])=>r===6&&c===6) && !cellsR.some(([r,c])=>r===5&&c===7), 'T3c ring1 只含周围1圈（斜角可、直线2格不可）');
  const e3 = Battle.mkZombie('walker', 5, 8, 1); Battle.b.units.push(e3);   // 距离3
  const sk2 = { name:'试作千金', cost:10, cd:2, type:'attack', shape:'target2', randMult:[0.5,2], range:2 };
  const cells2 = Battle.targetCells(me, sk2);
  assert(cells2.some(([r,c])=>r===5&&c===7) && !cells2.some(([r,c])=>r===5&&c===8), 'T3d target2 仍按射程过滤（距离3不可选）');
  assert(Battle.maxTargetsOf(sk2)===2 && Battle.maxTargetsOf(skT)===1, 'T3e 目标数上限：target2=2 / target=1');

  // ===== T4 castTargeted 执行：倍率伤害 + 扣费 + 行动标记 =====
  me.stamina = 100; me.hasAttacked = false;
  const rnd4 = Math.random; Math.random = () => 0.99;   // 固定掷骰避免暴击干扰数值断言
  await Battle.castTargeted(me, skT, e1);
  Math.random = rnd4;
  assert(e1.hp < e1.maxHp, `T4a 造成伤害（${e1.maxHp-e1.hp}）`);
  assert(e1.hp === e1.maxHp - Math.max(1, Math.round(me.atk*1.5) - e1.def), `T4b 伤害 = 攻×150% 结算防御（${e1.maxHp-e1.hp}）`);
  assert(me.stamina === 90, `T4c 扣 10 体力（余 ${me.stamina}）`);
  assert(me.hasAttacked === true, 'T4d 本回合已行动');
  assert(me.cds['试作打击']===2, 'T4e 技能进入 CD2');

  // ===== T5 castTargeted 校验：越程 / 友军 / 死亡目标一律拒绝且不扣费 =====
  const c2 = Game.createChar('soldier','指二',false); g.chars.push(c2);
  const me2 = Battle.mkAlly(c2, 0, 0); Battle.b.units.push(me2);
  me2.stamina = 100; me2.hasAttacked = false;
  const far = Battle.mkZombie('walker', 0, 5, 1); Battle.b.units.push(far);   // 距离5
  await Battle.castTargeted(me2, skT, far);
  assert(far.hp === far.maxHp && me2.stamina===100 && !me2.hasAttacked, 'T5a 越程目标拒绝：无伤害不扣费');
  await Battle.castTargeted(me2, skT, me);           // 友军
  assert(me.hp === me.maxHp && me2.stamina===100, 'T5b 友军目标拒绝');
  const dead = Battle.mkZombie('walker', 0, 1, 1); dead.hp = 0; Battle.b.units.push(dead);
  await Battle.castTargeted(me2, skT, dead);
  assert(me2.stamina===100 && !me2.hasAttacked, 'T5c 死亡目标拒绝');

  // ===== T6 数据驱动扩展：新技能只写数据即可用（fixedDmg+状态 / 偷窃+强力 / randMult 双目标） =====
  const me3 = Battle.mkAlly(Game.createChar('soldier','指三',false), 3, 3); g.chars.push(g.chars[g.chars.length-1]); Battle.b.units.push(me3);
  me3.stamina = 100; me3.hasAttacked = false;
  const foe = Battle.mkZombie('walker', 3, 4, 1); Battle.b.units.push(foe);
  const skNew = { name:'试毒镖', cost:5, cd:0, type:'attack', shape:'target', fixedDmg:10, range:1, poison:{turns:3} };
  await Battle.castTargeted(me3, skNew, foe);
  assert(foe.sts && foe.sts.poison && foe.sts.poison.t===3, 'T6a 新定义技能：fixedDmg + 中毒立即生效（零新增代码）');
  assert(foe.hp === foe.maxHp-10, 'T6b 固定伤害无视防御');
  const skSteal = { name:'试偷窃', cost:5, cd:0, type:'attack', shape:'ring1', mult:1.0, stealPct:0.1, selfStrong:2 };
  me3.row = 3; me3.col = 4; me3.hasAttacked = false;   // 紧贴目标（环形1圈）
  const foe2 = Battle.mkZombie('runner', 4, 5, 1); foe2.maxHp = 200; foe2.hp = 200; Battle.b.units.push(foe2);
  const gold0 = Battle.b.loot.gold;
  const rnd6 = Math.random; Math.random = () => 0.99;
  await Battle.castTargeted(me3, skSteal, foe2);
  Math.random = rnd6;
  assert(Battle.b.loot.gold > gold0, `T6c stealPct 偷取金币（+${Battle.b.loot.gold-gold0}）`);
  assert(me3.sts && me3.sts.strong && me3.sts.strong.t===2, 'T6d selfStrong 自身强力2回合');
  const me4 = Battle.mkAlly(Game.createChar('soldier','指四',false), 0, 0); Battle.b.units.push(me4);
  me4.stamina = 100; me4.hasAttacked = false;
  const fA = Battle.mkZombie('walker', 0, 2, 1); const fB = Battle.mkZombie('runner', 1, 1, 1);
  fA.hp=fA.maxHp=300; fB.hp=fB.maxHp=300; Battle.b.units.push(fA, fB);
  const skRand2 = { name:'试千金', cost:10, cd:0, type:'attack', shape:'target2', randMult:[0.5,2], range:2 };
  const origRnd = Math.random; Math.random = () => 0.99;   // 固定掷骰：randMult≈上界、不触发暴击
  await Battle.castTargeted(me4, skRand2, [fA, fB]);
  Math.random = origRnd;
  const dA = 300-fA.hp, dB = 300-fB.hp;
  assert(dA>0 && dB>0, `T6e 双目标各自受伤（${dA}/${dB}）`);
  assert(dA >= Math.round(me4.atk*0.5)-fA.def && dA <= Math.round(me4.atk*2), `T6f 随机倍率落界内（${dA}）`);

  // ===== T7 既有真实技能走统一入口：奋力一击（平民）与凶猛撕咬（丧尸犬） =====
  const civ = DATA.CLASSES.civilian;
  const skReal = (civ.skills||[]).concat(civ.skill?[civ.skill]:[]).find(s=>s && s.name==='奋力一击');
  const me5 = Battle.mkAlly(Game.createChar('soldier','指五',false), 5, 5); Battle.b.units.push(me5);
  me5.stamina = 100; me5.hasAttacked = false;
  const foe5 = Battle.mkZombie('walker', 5, 6, 1); Battle.b.units.push(foe5);
  const rnd7 = Math.random; Math.random = () => 0.99;
  await Battle.castTargeted(me5, skReal, foe5);
  Math.random = rnd7;
  assert(foe5.hp === foe5.maxHp - Math.max(1, Math.round(me5.atk*1.6)-foe5.def), 'T7a 奋力一击 160% 走统一函数数值不变');
  const dog = Battle.mkZombie('runner', 8, 8, 1);   // runner = 丧尸犬
  if (dog) {
    const bite = dog.skills && dog.skills.find(s=>s.name==='凶猛撕咬');
    assert(bite && bite.shape==='target' && bite.mult===1.2 && bite.bleed, 'T7b 丧尸犬「凶猛撕咬」符合指定技能 schema');
    dog.row=8; dog.col=8; dog.hasAttacked=false;
    const victim = Battle.mkAlly(Game.createChar('soldier','指六',false), 8, 7); Battle.b.units.push(victim);
    victim.hp = victim.maxHp = 200;
    await Battle.castTargeted(dog, bite, victim);
    assert(victim.sts && victim.sts.bleed && victim.sts.bleed.t===2, 'T7c 撕咬→流血2回合（敌用统一函数打我方）');
  }

  // ===== T8 点击路由与 AI 均已接入统一入口 =====
  assert(html.includes('return Battle.castTargeted(u0, sk, u);'), 'T8a 玩家点击路由走 castTargeted');
  assert(html.includes('await Battle.castTargeted(u, sk, cast.target);'), 'T8b 丧尸 AI 走 castTargeted');
  assert(html.includes('b.targetSet = Battle.targetCells(u, sk);'), 'T8c cmdSkill 目标格统一生成');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
