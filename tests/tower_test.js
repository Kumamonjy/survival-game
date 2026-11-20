/* V143 防御工事（箭塔/弩塔）：数据、建造升级、底部两行部署、自动开火、穿射、摧毁 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const T = DATA.TOWERS;

const mkTerrain = () => Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain'));
const mkB = (units) => ({ units, selected:units[0], terrain:mkTerrain(), mode:null, turn:1, phase:'player', speed:1,
  stats:{}, log:[], loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, zone:DATA.ZONES[0] });

(async () => {
  // ===== T1 数据 =====
  assert(T.arrow && T.ballista, 'T1a 两种防御工事数据齐备');
  assert(T.arrow.name==='箭塔' && T.arrow.hp===200 && T.arrow.atk===50 && T.arrow.range===3, 'T1b 箭塔 200/50/射程3');
  assert(T.arrow.critRate===0.05 && T.arrow.critDmg===1.5, 'T1c 箭塔暴击 5%/150%');
  assert(T.ballista.name==='弩塔' && T.ballista.hp===180 && T.ballista.atk===40 && T.ballista.range===2, 'T1d 弩塔 180/40/射程2');
  assert(T.ballista.skill && T.ballista.skill.name==='穿射' && T.ballista.skill.shape==='line'
    && T.ballista.skill.lineLen===2 && T.ballista.skill.cd===3 && T.ballista.skill.cost===0, 'T1e 穿射：直线2格/冷却3/无体力消耗');
  assert(T.arrow.buildCost.gold===50 && T.ballista.buildCost.gold===60, 'T1f 建造金币下调（50/60）');
  assert(T.arrow.buildCost.wood===24 && T.arrow.buildCost.metal===10
    && T.ballista.buildCost.wood===20 && T.ballista.buildCost.metal===15, 'T1g 木材/金属小幅提高');

  // ===== T2 建造：多资源、各限一座 =====
  g.res.gold = 1000; g.res.wood = 100; g.res.metal = 100;
  Game.buildTower('arrow');
  assert(g.towerArrowLv===1, 'T2a 建造箭塔成功 Lv.1');
  assert(g.res.gold===950 && g.res.wood===76 && g.res.metal===90, 'T2b 按新成本扣三资源（50💰+24🪵+10⚙️）');
  Game.buildTower('arrow');
  assert(g.towerArrowLv===1 && g.res.gold===950, 'T2c 箭塔最多 1 座（重复建造无效）');
  g.res.metal = 0;
  Game.buildTower('ballista');
  assert(g.towerBallistaLv===0, 'T2d 资源不足无法建造弩塔');
  g.res.metal = 100;
  Game.buildTower('ballista');
  assert(g.towerBallistaLv===1 && g.res.gold===890 && g.res.wood===56 && g.res.metal===85, 'T2e 弩塔建造成功并按新成本扣资源');

  // ===== T3 升级：金币递增、上限 5 =====
  const c1 = Game.upCost({ upgradeCost:T.arrow.upgradeCost }, 1);
  assert(c1===180, 'T3a 箭塔 Lv1→2 升级费 180（120×1.5）');
  const before = g.res.gold;
  Game.upTower('arrow');
  assert(g.towerArrowLv===2 && g.res.gold===before-180, 'T3b 升级扣费并提升等级');
  g.towerArrowLv = T.arrow.maxLv;
  Game.upTower('arrow');
  assert(g.towerArrowLv===T.arrow.maxLv, 'T3c 达到 Lv.5 后不再升级');

  // ===== T4 单位属性随等级成长（+10%/级） =====
  const t1 = Battle.mkTower('arrow', 1, 11, 4);
  const t3 = Battle.mkTower('arrow', 3, 11, 5);
  assert(t1.hp===200 && t1.atk===50 && t1.range===3, 'T4a Lv1 箭塔基础属性');
  assert(t3.hp===240 && t3.atk===60, 'T4b Lv3 箭塔 +20%：生命240/攻击60');
  assert(t1.isTower && t1.move===0 && t1.stamina===undefined && t1.ref===undefined, 'T4c 工事不可移动、无体力、无角色引用');
  const t2 = Battle.mkTower('ballista', 1, 12, 4);
  assert(t2.hp===180 && t2.atk===40 && t2.range===2 && t2.skills.length===1, 'T4d 弩塔属性与穿射技能');

  // ===== T5 部署：必须指派操作员，且随机落在底部两行 =====
  g.towerArrowLv = 1; g.towerBallistaLv = 1;
  const op1 = Game.createChar('soldier', '操作员甲'); op1.stamina = 50;
  const op2 = Game.createChar('soldier', '操作员乙'); op2.stamina = 50;
  g.chars.push(op1, op2);
  Game.assignTowerOp('arrow', op1.id);
  Game.assignTowerOp('ballista', op2.id);
  assert(g.towerArrowOp===op1.id && g.towerBallistaOp===op2.id, 'T5a 可指派操作员');
  assert(Game.dutyOf(op1.id)==='箭塔操控' && Game.dutyOf(op2.id)==='弩塔操控', 'T5b 操作员占用职务（不可一人兼两职）');
  assert(Game.towerOperator('arrow')===op1, 'T5c 健康操作员有效');
  const bSp = mkB([]); Battle.b = bSp;
  Battle.spawnTowers(bSp);
  const tws = bSp.units.filter(u=>u.isTower);
  assert(tws.length===2, 'T5d 已建造且已指派的工事全部部署');
  const bottomRows = [Battle.ROWS-2, Battle.ROWS-1];
  assert(tws.every(u=>bottomRows.includes(u.row)), 'T5e 工事仅出现在底部两行（' + tws.map(u=>u.row+','+u.col).join(' ') + '）');
  const keys = tws.map(u=>u.row+','+u.col);
  assert(new Set(keys).size===keys.length, 'T5f 两座工事不重叠');

  // 未指派 / 重伤 → 不部署
  g.towerArrowOp = null;
  const bUn = mkB([]); Battle.b = bUn;
  Battle.spawnTowers(bUn);
  assert(bUn.units.filter(u=>u.isTower).length===1 && !bUn.units.some(u=>u.towerType==='arrow'), 'T5g 箭塔未指派操作员时不参战');
  assert(bUn.log.some(e=>e.msgs.some(m=>m.m.includes('无人操控'))), 'T5h 未指派时给出提示日志');
  g.towerArrowOp = op1.id; op1.injured = true;
  assert(Game.towerOperator('arrow')===null, 'T5i 操作员重伤时工事失效');
  const bInj = mkB([]); Battle.b = bInj;
  Battle.spawnTowers(bInj);
  assert(!bInj.units.some(u=>u.towerType==='arrow'), 'T5j 操作员重伤时不部署');
  op1.injured = false;

  // 指派校验：重伤者 / 已有职务者不可指派
  const opInj = Game.createChar('soldier', '伤员'); opInj.injured = true; g.chars.push(opInj);
  Game.assignTowerOp('ballista', opInj.id);
  assert(g.towerBallistaOp===op2.id, 'T5k 重伤者不能担任操作员');
  const opBusy = Game.createChar('soldier', '忙碌者'); opBusy.stamina = 50; g.chars.push(opBusy);
  g.kitchenChef = opBusy.id;
  Game.assignTowerOp('ballista', opBusy.id);
  assert(g.towerBallistaOp===op2.id, 'T5l 已有职务者不能兼任操作员');
  g.kitchenChef = null;

  g.towerArrowLv = 0; g.towerBallistaLv = 0;
  g.towerArrowOp = null; g.towerBallistaOp = null;
  const bNo = mkB([]); Battle.b = bNo;
  Battle.spawnTowers(bNo);
  assert(bNo.units.length===0, 'T5m 未建造则不部署');

  // ===== T6 箭塔自动普攻最近敌人 =====
  const zA = Battle.mkZombie('walker', 9, 5, 1);
  const tower = Battle.mkTower('arrow', 1, 11, 5);
  const b1 = mkB([tower, zA]); Battle.b = b1;
  const arrowRow = tower.row, arrowCol = tower.col;
  await Battle.towerAct(tower);
  assert(zA.hp < zA.maxHp && tower.hasAttacked, 'T6a 射程3内自动攻击并标记行动');
  assert((b1.stats[tower.uid]||{}).dmg > 0, 'T6b 工事伤害计入战报');
  assert(tower.row===arrowRow && tower.col===arrowCol, 'T6c 工事开火后位置不变');

  // ===== T7 弩塔穿射：直线 2 格内全部命中 + CD3 =====
  const z1 = Battle.mkZombie('walker', 10, 5, 1);
  const z2 = Battle.mkZombie('walker', 9, 5, 1);
  const bt = Battle.mkTower('ballista', 1, 11, 5);
  const b2 = mkB([bt, z1, z2]); Battle.b = b2;
  await Battle.towerAct(bt);
  assert(z1.hp < z1.maxHp && z2.hp < z2.maxHp, 'T7a 穿射贯穿直线上 2 名敌人');
  assert((bt.cds['穿射']||0)===3, 'T7b 施放后进入 3 回合冷却');
  Battle.newRoundReset(bt);
  assert((bt.cds['穿射']||0)===2, 'T7c 新回合冷却递减到 2');
  // 冷却中：只普攻最近目标，直线远端不掉血
  const z3 = Battle.mkZombie('walker', 10, 5, 1);
  const z4 = Battle.mkZombie('walker', 9, 5, 1);
  const bt2 = Battle.mkTower('ballista', 1, 11, 5);
  bt2.cds['穿射'] = 3;
  const b3 = mkB([bt2, z3, z4]); Battle.b = b3;
  await Battle.towerAct(bt2);
  assert(z3.hp < z3.maxHp && z4.hp === z4.maxHp, 'T7d 冷却中退化为普攻（仅最近目标）');

  // ===== T8 工事被摧毁：本场消失、不重伤、不计击杀 =====
  const zB = Battle.mkZombie('walker', 5, 5, 1);
  const td = Battle.mkTower('arrow', 1, 6, 5);
  const b4 = mkB([td, zB]); Battle.b = b4;
  td.hp = 10;
  await Battle.applyDamage(zB, td, 999, false, 1);
  assert(td.hp===0, 'T8a 工事生命归零');
  assert(!(b4.stats[zB.uid]||{}).kill, 'T8b 击毁工事不计击杀');
  assert(b4.log.some(e=>e.msgs.some(m=>m.m.includes('被摧毁'))), 'T8c 记录摧毁日志');

  // ===== T9 胜负判定不计工事 =====
  const cDead = Game.createChar('civilian', '倒下者'); cDead.hp = 0;
  const allyDead = Battle.mkAlly(cDead, 5, 4); allyDead.hp = 0;
  const zC = Battle.mkZombie('walker', 0, 0, 1);
  const twAlive = Battle.mkTower('arrow', 1, 11, 5);
  const b5 = mkB([allyDead, twAlive, zC]); Battle.b = b5;
  Battle.checkBattleEnd();
  assert(b5.over===true, 'T9 角色全倒时战斗结束（工事存活不阻止失败）');

  // ===== T10 结算：工事不参与回写与经验 =====
  const cLive = Game.createChar('soldier', '存活者'); cLive.exp = 0;
  g.chars.push(cLive);
  const allyLive = Battle.mkAlly(cLive, 5, 4);
  const twEnd = Battle.mkTower('ballista', 2, 11, 6);
  const zDead = Battle.mkZombie('walker', 0, 0, 1); zDead.hp = 0;
  const b6 = { zone:DATA.ZONES[0], turn:2, phase:'player', speed:1, over:false, doubledReward:false,
    loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, stats:{}, log:[], ruins:{}, lootBase:null,
    units:[allyLive, twEnd, zDead] };
  Battle.b = b6;
  await Battle.finish('win');
  assert(b6.over===true && cLive.exp===15 && !cLive.injured, 'T10a 结算正常发放角色经验且不崩溃');
  assert(twEnd.hp===twEnd.maxHp, 'T10b 工事状态不回写、不受影响');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
