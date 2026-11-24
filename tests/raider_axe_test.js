/* V230 劫掠者·斧王：HP300/攻100/防15/移2/射程2/暴击15%/暴伤200%，技能「横扫千军」sweep2 3×2 / 70% 攻 / CD4 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定义与属性 =====
  const A = DATA.ZOMBIES.raider_axe;
  assert(A && A.name==='斧王' && A.icon==='🪓' && A.species==='raider', 'T1a 斧王定义（🪓 / 劫掠者系）');
  const b0 = A.base;
  assert(b0.maxHp===300 && b0.atk===100 && b0.def===15 && b0.move===2 && b0.range===2 && b0.critRate===15 && b0.critDmg===200, 'T1b 基础属性 300/100/15/移2/射程2/暴15%/暴伤200%');
  assert(A.exp===30 && A.gold[0]===7 && A.gold[1]===10, 'T1c 经验 30（高于酒鬼 28）/ 金币 7-10');
  assert(A.weight===0 && !A.boss, 'T1d 非随机池直接刷新（经区域 pool 低权重出现）/ 非 Boss');

  // ===== T2 技能参数 =====
  const sk = A.skills[0];
  assert(sk && sk.name==='横扫千军' && sk.shape==='sweep2' && sk.sweepLen===3 && sk.sweepWid===2 && sk.mult===0.7 && sk.cd===4 && sk.cost===0, 'T2 横扫千军：sweep2 3×2 / 70% 攻 / CD4 / 敌方无体力消耗');

  // ===== T3 sweepCells 覆盖：向右 3×2 = 6 格 =====
  const axe = Battle.mkZombie('raider_axe', 5, 5, 1);
  axe.critRate = 0;   // 关暴击避免随机
  const cells = Battle.sweepCells(axe, 0, 1, sk);
  const cs = cells.map(p=>p.join(',')).sort();
  assert(cells.length===6 && cs.includes('5,6') && cs.includes('5,8') && cs.includes('6,6') && cs.includes('6,8'), `T3 向右 3×2 覆盖 6 格（实际 ${cs.join(' ')}）`);

  // ===== T4 AI 横扫：两目标各受 70%攻-防 伤害 =====
  const b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null,
    loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false,
    subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  Battle.b = b;
  const t1 = Battle.mkAlly(g.chars[0], 5, 6);   // 覆盖格 1
  const t2 = Battle.mkAlly(g.chars[1], 6, 8);   // 覆盖格 2（3 格长 × 2 宽的另一列）
  b.units.push(axe, t1, t2);
  axe.cds = {};
  b.selected = axe;
  await Battle.zombieAct(axe);
  const exp1 = Math.max(1, Math.round(100*0.7 - t1.def));
  const exp2 = Math.max(1, Math.round(100*0.7 - t2.def));
  assert(t1.hp===t1.maxHp-exp1, `T4a 目标1 受 ${exp1}（70%×100-防${t1.def}）`);
  assert(t2.hp===t2.maxHp-exp2, `T4b 目标2 受 ${exp2}（横扫 3×2 同时命中两格）`);
  assert(axe.cds['横扫千军']===4, 'T4c 技能进 CD4');

  // ===== T5 CD 中普攻：射程 2 内单目标 =====
  const t3 = Battle.mkAlly(g.chars[2], 5, 7);
  b.units = [axe, t3];   // 清场：T4 目标移除，普攻目标唯一
  axe.row = 5; axe.col = 5; axe.critRate = 0; axe.cds = { '横扫千军': 3 };
  t3.hp = t3.maxHp;
  b.selected = axe;
  await Battle.zombieAct(axe);
  const exp3 = Math.max(1, Math.round(100 - t3.def));
  assert(t3.hp===t3.maxHp-exp3 && axe.cds['横扫千军']===2, 'T5 CD 期间照常普攻（100攻-防；回合开始 CD 3→2）');

  // ===== T6 敌我不分？不——sweep2 只打敌方 =====
  const mate = Battle.mkZombie('walker', 6, 6, 1);
  b.units.push(mate);
  const mh0 = mate.hp;
  axe.cds = {};
  b.selected = axe;
  await Battle.zombieAct(axe);
  assert(mate.hp===mh0, 'T6 横扫不误伤丧尸同伴');

  // ===== T7 百科敌图鉴收录 =====
  UI.wikiTab = 'enemy'; UI.openWiki();
  const w = elems['wiki-content'].innerHTML;
  assert(w.includes('斧王') && w.includes('横扫千军') && w.includes('🪓'), 'T7 百科敌图鉴收录斧王（图标/技能）');

  // ===== T8 区域 pool：商业街 / 军事基地 =====
  const Z = DATA.ZONES;
  assert(Z.find(z=>z.id==='street').pool.raider_axe===4 && Z.find(z=>z.id==='base').pool.raider_axe===3, 'T8 商业街权重4 / 军事基地权重3');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
