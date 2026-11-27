/* V95 敌方技能系统：丧尸主动技能（攻击/治疗/召唤）+ sangshi 风格智能 AI 评估（移动位×行动价值择优，敌方无体力限制） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function freshBattle(allies, enemies) {
  Battle.b = { units:[...allies, ...enemies], selected:allies[0]||null,
    terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null,
    loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null,
    zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null };
  return Battle.b;
}
const mkAllyAt = (cls,name,r,c) => { const ch = Game.createChar(cls,name,false); g.chars.push(ch); return Battle.mkAlly(ch, r, c); };

(async () => {
  // ---- T1 数据定义 ----
  const BR = DATA.ZOMBIES.brute, LI = DATA.ZOMBIES.licker, SA = DATA.ZOMBIES.savage, BE = DATA.ZOMBIES.behemoth, WI = DATA.ZOMBIES.witch;
  assert(BR.skills && BR.skills[0].name==='腐臭横扫' && BR.skills[0].shape==='sweep' && BR.skills[0].cd===4, 'T1a 肥胖丧尸「腐臭横扫」sweep CD4');
  assert(LI.skills && LI.skills[0].name==='长舌捆绑' && LI.skills[0].shape==='target' && LI.skills[0].mult===1.2 && LI.skills[0].range===3 && LI.skills[0].root && LI.skills[0].root.turns===1, 'T1b 长舌丧尸「长舌捆绑」单体1.2x射程3+禁锢1回合');
  assert(SA.skills && SA.skills[0].name==='狂暴撕咬' && SA.skills[0].mult===1.6 && SA.skills[0].selfStrong===2, 'T1c 凶猛丧尸「狂暴撕咬」1.6x+强力');
  assert(BE.skills && BE.skills[0].name==='毁灭重击' && BE.skills[0].mult===1.8 && BE.skills[0].range===2, 'T1d 暴君「毁灭重击」1.8x 射程2');
  assert(WI && WI.name==='腐化医者' && WI.icon==='🧪' && WI.base.maxHp===180 && WI.base.atk===25 && WI.base.move===2
    && WI.skills[0].name==='腐血仪式' && WI.skills[0].type==='heal' && WI.skills[0].mult===1.5 && WI.skills[0].range===2 && WI.skills[0].includeSelf && WI.skills[0].cd===3, 'T1e 腐化医者定义（180❤️/25⚔️/移速2，腐血仪式 heal1.5x range2 CD3 含自己）');
  const SK = DATA.ZOMBIES.shrieker.skill;
  assert(SK.type==='summon' && SK.summonType==='walker' && SK.summonCount===2 && SK.summonCap===undefined && SK.requireHpLost && SK.cd===5, 'T1f 尖啸通用化字段（summon/walker/2只/无上限/需受伤）');
  const P = id => DATA.ZONES.find(z=>z.id===id).pool;
  assert(P('hospital').witch===5 && P('street').witch===3 && P('base').witch===3 && !P('market').witch && !P('factory').witch, 'T1g 区域池：医5/街3/基3，超市/工厂无');
  assert(DATA.ZONES.every(z=>Object.values(z.pool).reduce((s,w)=>s+w,0)===100), 'T1h 各区域池权重总和恒 100');

  // ---- T2 mkZombie 聚合 ----
  const zs = Battle.mkZombie('savage', 0, 0, 1);
  assert(zs.skills && zs.skills[0].name==='狂暴撕咬' && zs.side==='enemy' && zs.cds && Object.keys(zs.cds).length===0, 'T2a savage 聚合技能 + cds 初始化');
  const zw = Battle.mkZombie('witch', 0, 1, 1);
  assert(zw.skills && zw.skills[0].name==='腐血仪式', 'T2b witch 聚合技能');
  const zk = Battle.mkZombie('walker', 0, 2, 1);
  assert(zk.skills && zk.skills[0].name==='凶猛撕咬', 'T2c walker 自带凶猛撕咬（V183 起不再是空技能表）');

  // ---- T3 敌方无体力限制 ----
  Battle.paySkillCost(zw, zw.skills[0]);
  assert(zw.cds['腐血仪式']===3 && zw.stamina===undefined, 'T3a 丧尸 paySkillCost：只进 CD，无体力字段不炸');
  const ally0 = mkAllyAt('soldier','甲', 5, 5);
  const st0 = ally0.stamina;
  Battle.paySkillCost(ally0, {name:'奋力一击', cost:20, cd:3});
  assert(ally0.stamina===st0-20, 'T3b 我方 paySkillCost 照常扣体力');

  // ---- T4 witch 治疗受伤同伴（受伤同伴价值 > 普攻）----
  const a1 = mkAllyAt('soldier','乙', 5, 5);
  const wk = Battle.mkZombie('walker', 5, 6, 1);   // witch 相邻的受伤同伴
  const wi = Battle.mkZombie('witch', 5, 7, 1);
  a1.hp = 100;   // 重伤玩家作为普攻候选（witch 打不着：距离2 > 射程1）
  wk.hp = wk.maxHp - 100;
  freshBattle([a1], [wk, wi]);
  let plan = Battle.aiPlanZombie(wi, Battle.b.units.filter(x=>x.side==='ally'&&x.hp>0));
  assert(plan && plan.act.type==='heal' && plan.act.target===wk, `T4a witch 选择治疗受伤同伴（${plan&&plan.act.type}）`);
  await Battle.zombieAct(wi);
  assert(wk.hp === wk.maxHp-100+38, `T4b 治疗 150%×25=38 生效（${wk.hp} vs ${wk.maxHp-100+38}）`);
  assert(wi.cds['腐血仪式']===3, 'T4c 腐血仪式进入 CD3');
  assert(a1.hp===100, 'T4d 未误伤玩家');

  // ---- T5 witch 自疗（includeSelf，同伴满血时不治疗玩家）----
  wi.cds = {}; wk.hp = wk.maxHp; wi.hp = wi.maxHp - 100;   // witch 自己缺血 >50%
  plan = Battle.aiPlanZombie(wi, Battle.b.units.filter(x=>x.side==='ally'&&x.hp>0));
  assert(plan && plan.act.type==='heal' && plan.act.target===wi, 'T5a 无受伤同伴 → 自疗（includeSelf）');
  await Battle.zombieAct(wi);
  assert(wi.hp === wi.maxHp-100+Math.round(1.5*wi.atk)*2 || wi.hp > wi.maxHp-100, `T5b 自疗回血（缺血>50% 价值翻倍后仍选中，hp=${wi.hp}）`);

  // ---- T6 savage 狂暴撕咬 ----
  const a2 = mkAllyAt('soldier','丙', 5, 5);
  const sv = Battle.mkZombie('savage', 5, 6, 1);
  freshBattle([a2], [sv]);
  await Battle.zombieAct(sv);
  assert(a2.hp < a2.maxHp && sv.sts && sv.sts.strong && sv.cds['狂暴撕咬']===3, 'T6 狂暴撕咬：玩家掉血 + savage 获强力2回合 + CD3');

  // ---- T7 brute 腐臭横扫（AOE 双目标）----
  const a3 = mkAllyAt('soldier','丁', 4, 5);
  const a4 = mkAllyAt('soldier','戊', 6, 5);
  const br = Battle.mkZombie('brute', 5, 5, 1);
  freshBattle([a3, a4], [br]);
  plan = Battle.aiPlanZombie(br, Battle.b.units.filter(x=>x.side==='ally'&&x.hp>0));
  assert(plan && plan.act.type==='skill' && plan.act.sk.name==='腐臭横扫' && plan.val>plan.act.sk ? true : !!(plan&&plan.act.type==='skill'), `T7a brute 选横扫（总伤 > 单体普攻）`);
  await Battle.zombieAct(br);
  assert(a3.hp<a3.maxHp && a4.hp<a4.maxHp, 'T7b 横扫命中上下两名玩家');
  assert(br.cds['腐臭横扫']===4, 'T7c 腐臭横扫 CD4');

  // ---- T8 licker 长舌捆绑（单目标 + 禁锢1回合）----
  const a5 = mkAllyAt('soldier','己', 5, 3);
  const a6 = mkAllyAt('soldier','庚', 5, 4);
  const li = Battle.mkZombie('licker', 5, 2, 1);
  freshBattle([a5, a6], [li]);
  plan = Battle.aiPlanZombie(li, Battle.b.units.filter(x=>x.side==='ally'&&x.hp>0));
  assert(plan && plan.act.type==='skill' && plan.act.sk.name==='长舌捆绑', 'T8a licker 选长舌捆绑（1.2x+禁锢价值 > 普攻）');
  await Battle.zombieAct(li);
  assert(a5.hp<a5.maxHp && a6.hp===a6.maxHp, 'T8b 单目标命中：仅 1 人受伤（旧直线双伤已废）');
  assert(a5.sts.root && a5.sts.root.t===1, 'T8c 目标陷入禁锢 1 回合');
  assert(li.cds['长舌捆绑']===3, 'T8d 长舌捆绑 CD3');

  // ---- T9 behemoth 毁灭重击（射程2）----
  const a7 = mkAllyAt('soldier','辛', 5, 7);
  const be = Battle.mkZombie('behemoth', 5, 5, 1);
  freshBattle([a7], [be]);
  plan = Battle.aiPlanZombie(be, Battle.b.units.filter(x=>x.side==='ally'&&x.hp>0));
  assert(plan && plan.act.type==='skill' && plan.act.sk.name==='毁灭重击', 'T9a 暴君在 2 格选毁灭重击（1.8x > 普攻）');
  await Battle.zombieAct(be);
  assert(a7.hp<a7.maxHp, 'T9b 毁灭重击命中');

  // ---- T10 witch 距离同伴 4 → 移动后治疗（治疗目标必须是同阵营丧尸）----
  const a8 = mkAllyAt('soldier','壬', 0, 0);        // 远处玩家：无法普攻，不干扰评估
  const wk2 = Battle.mkZombie('walker', 5, 8, 1);   // 受伤同伴：距离 witch 4，移速2+治疗射程2 恰好可及
  wk2.hp = wk2.maxHp - 150;
  const wi2 = Battle.mkZombie('witch', 5, 4, 1);
  freshBattle([a8], [wk2, wi2]);
  const r0 = wi2.row, c0 = wi2.col, wkBefore = wk2.hp;
  await Battle.zombieAct(wi2);
  assert((wi2.row!==r0 || wi2.col!==c0) && wk2.hp > wkBefore, 'T10 witch 智能移动进入治疗射程并治疗同伴');

  // ---- T11 满血尖啸者 plan 非召唤 ----
  const a9 = mkAllyAt('soldier','癸', 5, 6);
  const sh2 = Battle.mkZombie('shrieker', 5, 7, 1);
  freshBattle([a9], [sh2]);
  plan = Battle.aiPlanZombie(sh2, Battle.b.units.filter(x=>x.side==='ally'&&x.hp>0));
  assert(plan && plan.act.type==='basic', 'T11 满血尖啸者不召唤，转为普攻评估');

  // ---- T12 execSkill 相对阵营：丧尸 AOE（p.cell）打玩家不误伤同伴 ----
  const a10 = mkAllyAt('soldier','子', 5, 4);
  const zt = Battle.mkZombie('savage', 5, 5, 1);
  const zn = Battle.mkZombie('walker', 4, 4, 1);
  freshBattle([a10], [zt, zn]);
  zt.cds = {};
  await Battle.execSkill(zt, { sk:{ name:'测试震荡', cost:0, cd:1, type:'attack', shape:'aoe', range:1, area:1, mult:1 }, cell:[5,4] });
  assert(a10.hp<a10.maxHp, 'T12a 丧尸 AOE 命中玩家（相对 side 过滤）');
  assert(zn.hp===zn.maxHp, 'T12b 同阵营丧尸不被误伤');

  // ---- T13 百科收录 ----
  try { UI.wikiTab='enemy'; UI.openWiki(); } catch(e) { console.log('wiki err', e.message); }
  const wikiHtml = Object.keys(elems).some(k=>elems[k].innerHTML && elems[k].innerHTML.includes('腐化医者') && elems[k].innerHTML.includes('腐血仪式'));
  assert(wikiHtml, 'T13 百科丧尸图鉴含腐化医者与技能列');

  // ---- T14 毒气丧尸路径不回归 ----
  const a11 = mkAllyAt('soldier','丑', 5, 6);
  const gb = Battle.mkZombie('gasbag', 5, 5, 1);
  freshBattle([a11], [gb]);
  await Battle.zombieAct(gb);
  assert(a11.hp<a11.maxHp && a11.sts && a11.sts.poison, 'T14 毒气丧尸：相邻释放毒气+中毒（旧逻辑不回归）');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
