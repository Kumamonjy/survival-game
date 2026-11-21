/* 丧尸犬技能「凶猛撕咬」：1 格内单体 120% 攻击 + 流血 2 回合 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkBattle() {
  const b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null,
    loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, fire:{}, over:false,
    subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null };
  Battle.b = b;
  return b;
}

(async () => {
  // ===== T1 技能数据 =====
  const R = DATA.ZOMBIES.runner;
  const sk = (R.skills || [])[0];
  assert(!!sk && sk.name === '凶猛撕咬', 'T1a 丧尸犬拥有「凶猛撕咬」');
  assert(sk.type === 'attack' && sk.shape === 'target' && sk.mult === 1.2 && sk.range === 1, 'T1b 1 格单体 120% 攻击');
  assert(sk.bleed && sk.bleed.turns === 2, 'T1c 命中附加流血 2 回合');
  assert(sk.cd === 3, 'T1d 冷却 3 回合');
  assert(R.desc.includes('凶猛撕咬'), 'T1e 图鉴描述提到新技能');

  // ===== T2 mkZombie 带入技能与冷却表 =====
  const b = mkBattle();
  const dog = Battle.mkZombie('runner', 5, 5, 1);
  b.units.push(dog);
  assert(dog.skills.length === 1 && dog.skills[0].name === '凶猛撕咬', 'T2a 丧尸犬单位携带技能');
  assert(dog.cds && typeof dog.cds === 'object', 'T2b 冷却表已初始化');
  assert(dog.atk === 50, `T2c 1 级攻击力 50（${dog.atk}）`);

  // ===== T3 技能结算：120% 伤害 + 流血 2 =====
  const c1 = Game.createChar('soldier', '狗粮', false); g.chars.push(c1);
  const a1 = Battle.mkAlly(c1, 5, 6); b.units.push(a1);
  a1.hp = a1.maxHp = 300; a1.def = 0;
  const origRandom = Math.random;
  Math.random = () => 0.99;          // 避免暴击，保证伤害可预期
  await Battle.execSkill(dog, { sk, target: a1 });
  Math.random = origRandom;
  assert(a1.hp === 240, `T3a 伤害 = round(50×1.2)=60（${a1.hp}）`);
  assert(a1.sts && a1.sts.bleed && a1.sts.bleed.t === 2, 'T3b 目标陷入流血 2 回合');
  assert(dog.cds['凶猛撕咬'] === 3, 'T3c 使用后进入 3 回合冷却');
  assert(dog.stamina === undefined, 'T3d 丧尸技能不消耗体力（只走冷却）');

  // ===== T4 AI 会主动选择该技能 =====
  const b4 = mkBattle();
  const dog4 = Battle.mkZombie('runner', 5, 5, 1);
  const c4 = Game.createChar('soldier', '狗粮二', false); g.chars.push(c4);
  const a4 = Battle.mkAlly(c4, 5, 6);
  a4.hp = a4.maxHp = 300; a4.def = 0;
  b4.units = [dog4, a4];
  Math.random = () => 0.99;
  const plan = Battle.aiPlanZombie(dog4, [a4]);
  Math.random = origRandom;
  assert(plan && plan.act && plan.act.type === 'skill' && plan.act.sk.name === '凶猛撕咬',
    `T4a 相邻目标时 AI 优先用技能（${plan && plan.act && plan.act.type}）`);
  dog4.cds['凶猛撕咬'] = 1;
  const plan2 = Battle.aiPlanZombie(dog4, [a4]);
  assert(plan2 && plan2.act.type === 'basic', 'T4b 冷却中回退普攻');

  // ===== T5 图鉴展示 =====
  UI.wikiTab = 'enemy';
  UI.openWiki();
  const wiki = elems['wiki-content'] ? elems['wiki-content'].innerHTML : '';
  assert(wiki.includes('凶猛撕咬') && wiki.includes('120%'), 'T5 丧尸图鉴展示新技能');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
