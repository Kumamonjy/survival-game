/* V183 游荡丧尸新增技能「凶猛撕咬」（与丧尸犬同款：1 格内 120% 攻击力 + 流血 2 回合，cost0/CD3），AI 可评估并施放 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkB(units){
  return { units, selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, fires:{} };
}

(async () => {
  // ===== T1 定义：与丧尸犬同款同名技能 =====
  const w = DATA.ZOMBIES.walker;
  const sk = w.skills && w.skills[0];
  assert(sk && sk.name==='凶猛撕咬' && sk.shape==='target' && sk.range===1, 'T1a 游荡丧尸技能 = 凶猛撕咬（1 格单体）');
  assert(sk.mult===1.2 && sk.bleed && sk.bleed.turns===2, 'T1b 120% 攻击力 + 流血 2 回合');
  assert(sk.cost===0 && sk.cd===3, 'T1c 无体力消耗 / CD 3');
  const rsk = DATA.ZOMBIES.runner.skills[0];
  assert(JSON.stringify(sk)===JSON.stringify(rsk), 'T1d 与丧尸犬「凶猛撕咬」参数完全一致');
  assert(w.desc.includes('凶猛撕咬'), 'T1e 图鉴 desc 提及技能');

  // ===== T2 AI 评估：优先撕咬 =====
  Battle.b = mkB([]);
  const z = Battle.mkZombie('walker', 5, 5, 1);
  Battle.b.units.push(z);
  const p1 = Battle.mkAlly({ uid:'p1', name:'幸存者', cls:'civilian', level:1, exp:0, av:'🧍',
    hp:250, maxHp:250, stamina:100, maxStamina:100, atk:20, def:5, range:1, move:2, critRate:0, critDmg:150 }, 5, 6);
  Battle.b.units.push(p1);
  const cast = Battle.aiSkillDamage(z, sk, [p1]);
  assert(cast && cast.shape==='target' && cast.total>0, 'T2 AI 评估撕咬（1 格内玩家为最优目标）');

  // ===== T3 AI 执行：伤害 + 流血 =====
  const hp0 = p1.hp;
  await Battle.aiExecuteZombie(z, { type:'skill', sk, cast });
  const expDmg = Math.max(1, Math.round(z.atk*1.2) - p1.def);
  assert(p1.hp===hp0-expDmg, `T3a 撕咬伤害 = 120% 攻 - 防（-${expDmg}）`);
  assert(p1.sts && p1.sts.bleed && p1.sts.bleed.t===2, 'T3b 玩家陷入流血 2 回合');
  assert(z.cds['凶猛撕咬']===3, 'T3c 施放后进入 CD 3');
  assert(z.hasAttacked===true, 'T3d 已消耗本回合行动');

  // ===== T4 玩家端无感知：技能不出现在玩家技能列表 =====
  const ally = Battle.mkAlly({ uid:'a1', name:'甲', cls:'civilian', level:1, exp:0, av:'🧍',
    hp:200, maxHp:200, stamina:80, maxStamina:80, atk:20, def:5, range:1, move:2, critRate:0, critDmg:150 }, 3, 3);
  assert(!ally.skills.some(s=>s.name==='凶猛撕咬'), 'T4 玩家角色不会获得丧尸技能');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
