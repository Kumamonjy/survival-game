/* V224 丧尸行动标记修复：execSkill 不再给丧尸标记 hasAttacked（残留会误导玩家以为它本回合已行动），敌方信息卡不显示行动标签 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;

(async () => {
  const b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null,
    loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false,
    subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  Battle.b = b;

  // ===== T1 丧尸技能后不再标记 hasAttacked（跨回合残留的根源） =====
  const brute = Battle.mkZombie('brute', 5, 5, 1);
  const me = Battle.mkAlly(Game.g.chars[0], 5, 4);
  b.units.push(brute, me);
  b.selected = brute;
  await Battle.zombieAct(brute);
  assert(brute.hp>0 && me.hp<me.maxHp, 'T1a 丧尸技能正常造成伤害（行为不变）');
  assert(!brute.hasAttacked, 'T1b 丧尸技能后 hasAttacked 不再为 true（V224）');

  // ===== T2 敌方信息卡不显示行动标签 =====
  b.selected = brute;
  Battle.renderInfo(b.selected);
  assert(!elems['b-unitinfo'].innerHTML.includes('已攻击'), 'T2a 敌方不显示「已攻击 · 还可移动」');

  // ===== T3 我方标签不受影响：攻击后 = 已攻击 · 还可移动；休息后 = 行动完毕 =====
  const me2 = Battle.mkAlly(Game.g.chars[1], 4, 4);
  b.units.push(me2);
  me2.hasAttacked = false; me2.hasMoved = false;
  b.selected = me2;
  Battle.renderInfo(b.selected);
  assert(!elems['b-unitinfo'].innerHTML.includes('已攻击'), 'T3a 我方未行动时不显示标签');
  me2.hasAttacked = true; me2.hasMoved = false;
  Battle.renderInfo(b.selected);
  assert(elems['b-unitinfo'].innerHTML.includes('已攻击 · 还可移动'), 'T3b 我方攻击后显示「已攻击 · 还可移动」');
  me2.hasMoved = true;
  Battle.renderInfo(b.selected);
  assert(elems['b-unitinfo'].innerHTML.includes('行动完毕'), 'T3c 我方行动完毕显示「行动完毕」');

  // ===== T4 连续两回合：丧尸第二回合照常行动（原 bug 场景回归） =====
  brute.cds = { '腐臭横扫': 1 };   // 模拟上回合技能进 CD
  b.selected = brute;
  await Battle.zombieAct(brute);
  assert(me.hp < me.maxHp || me2.hp < me2.maxHp, 'T4 CD 中的丧尸下一回合照常普攻');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
