/* V94 尖啸者：受伤尖啸召唤 2 只游荡丧尸（周围2格随机空格），CD5，满血不叫 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 定义与分布
  const S = DATA.ZOMBIES.shrieker;
  assert(S && S.name==='尖啸者' && S.icon==='📢' && S.skill && S.skill.name==='尖啸' && S.skill.cd===5, 'T1a 尖啸者定义（CD5）');
  assert(S.base.maxHp===150 && S.base.atk===25 && S.base.def===5 && S.base.move===2, 'T1b 150❤️/25⚔️/5🛡️/移速2');
  assert(DATA.ZONES.find(z=>z.id==='hospital').pool.shrieker===8 && DATA.ZONES.find(z=>z.id==='factory').pool.shrieker===5
    && DATA.ZONES.find(z=>z.id==='street').pool.shrieker===7 && DATA.ZONES.find(z=>z.id==='base').pool.shrieker===7
    && !DATA.ZONES.find(z=>z.id==='market').pool.shrieker, 'T1c 医8/厂5/街7/基7，超市无');

  // T2 构造战斗：受伤尖啸者 → 召唤 2 只游荡丧尸
  const c = Game.createChar('soldier','兵',false);
  g.chars.push(c);
  const u = Battle.mkAlly(c, 5, 5);
  const sh = Battle.mkZombie('shrieker', 5, 9, 2);
  Battle.b = { units:[u, sh], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:2, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null };
  sh.hp = sh.maxHp - 50;   // 受伤 → 满足尖啸条件
  await Battle.zombieAct(sh);
  const spawned = Battle.b.units.filter(x=>x.side==='enemy' && x!==sh && x.zombieType==='walker');
  assert(spawned.length===2, `T2a 召唤 2 只游荡丧尸（${spawned.length}）`);
  assert(spawned.every(z=>Battle.manhattan(z, sh)<=2 && z.level===2), 'T2b 生成在周围 2 格内且与尖啸者同级(Lv2)');
  assert((sh.cds['尖啸']||0)>0, 'T2c 尖啸进入冷却');

  // T3 CD 期间不召唤，改普攻（把丧尸挪到攻击范围内）
  Battle.b.units = Battle.b.units.filter(x=>x===u || x===sh || x.zombieType==='walker');
  spawned.forEach((z,i)=>{ z.row = 0; z.col = i; });   // 挪开，不挡路
  sh.row = 5; sh.col = 7; sh.hp = sh.maxHp - 10;
  const before = Battle.b.units.length;
  await Battle.zombieAct(sh);
  assert(Battle.b.units.length===before, 'T3a CD 期间不再召唤');
  assert(u.hp < u.maxHp, 'T3b 转为普攻（玩家掉血）');

  // T4 满血不尖啸
  sh.hp = sh.maxHp; sh.cds = {};
  const cnt0 = Battle.b.units.length;
  await Battle.zombieAct(sh);
  assert(Battle.b.units.length===cnt0, 'T4 满血时不召唤');

  // T5 CD 递减：zombieAct 每回合递减，CD=1 递减到 0 → 当回合即可再尖啸（与玩家侧 CD 语义一致）
  sh.cds['尖啸'] = 1; sh.hp = sh.maxHp - 5;
  const cnt3 = Battle.b.units.length;
  await Battle.zombieAct(sh);
  assert(Battle.b.units.length>cnt3 && sh.cds['尖啸']===5, 'T5 CD=1 递减后当回合立即再尖啸并重新进入 CD5');

  // T6 召唤上限：场上丧尸 ≥14 时不召
  sh.cds = {}; sh.hp = sh.maxHp - 5;
  // 清掉召唤物，手动塞 14 只
  Battle.b.units = Battle.b.units.filter(x=>x.side==='ally');
  const pile = [];
  for (let i=0;i<14;i++){ const z = Battle.mkZombie('walker', 0, i%Battle.COLS, 1); pile.push(z); Battle.b.units.push(z); }
  const cnt2 = Battle.b.units.length;
  await Battle.zombieAct(sh);
  assert(Battle.b.units.length===cnt2, 'T6 场上 ≥14 只时不再召唤');

  // T7 百科收录
  UI.renderWiki ? UI.renderWiki('zombies') : null;
  const wikiHtml = Object.keys(elems).some(k=>elems[k].innerHTML && elems[k].innerHTML.includes('尖啸者'));
  assert(wikiHtml, 'T7 百科丧尸图鉴含尖啸者');

  console.log('--- done ---');
  process.exit(0);
})();
