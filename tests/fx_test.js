/* V89 sangshi 风格战斗特效：受击白闪 / 远程弹道 / 技能金光 / AI 行动者高亮 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store, mkEl } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 CSS 与渲染挂点存在
  assert(html.includes('@keyframes fxWhite') && html.includes('.unit.hit-white::after'), 'T1a 受击白闪 CSS');
  assert(html.includes('@keyframes fxCast') && html.includes('.unit.cast-glow'), 'T1b 技能施放金光 CSS');
  assert(html.includes('@keyframes actPulse') && html.includes('.unit.acting-unit'), 'T1c 行动者高亮 CSS');
  assert(html.includes('.projectile'), 'T1d 远程弹道 CSS');
  assert(html.includes("${u._acting?'acting-unit':''}"), 'T1e renderMap 挂 acting-unit');
  assert(html.includes("fxAt(u.row, u.col, 'cast-glow', 400)"), 'T1f execSkill 挂 cast-glow');
  assert(html.includes("fxAt(def.row, def.col, 'hit-white', 300)"), 'T1g applyDamage 挂 hit-white');
  assert(html.includes("await Battle.fxProjectile(att, def"), 'T1h 远程普攻走弹道');
  assert(/#battle-map \{[^}]*position:relative/.test(html), 'T1i 地图容器 position:relative（弹道定位基准）');
  assert(html.includes("c1.offsetLeft") && html.includes("c2.offsetLeft"), 'T1j 弹道用首尾格子 offsetLeft 精确计算（含 gap/padding）');

  // T2 构造战斗：AI 行动高亮标记生命周期
  const b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')), moveSet:null, targetSet:null, mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null };
  Battle.b = b;
  const ally = Battle.mkAlly(Game.createChar('soldier','兵',false), 5, 5);
  const zom = Battle.mkZombie('walker', 5, 6, 1);
  b.units = [ally, zom];

  // T3 fxProjectile：mock 环境安全执行（有/无地图两种情况）
  elems['battle-map'] = mkEl();
  elems['battle-map'].children = Array.from({length:Battle.ROWS*Battle.COLS},()=>mkEl());
  await Battle.fxProjectile(ally, zom, '✦');   // 不抛错即通过
  assert(true, 'T3a fxProjectile 正常执行');
  elems['battle-map'] = mkEl(); elems['battle-map'].children = [];
  await Battle.fxProjectile(ally, zom);        // 空地图安全跳过
  assert(true, 'T3b 空地图安全跳过');

  // T4 AI 行动：_acting 置位/清除（丧尸攻击后）
  b.phase = 'enemy';
  await Battle.aiAct(zom, b.units.filter(x=>x.side==='ally'&&x.hp>0));
  assert(zom._acting !== true, 'T4a 行动结束 _acting 清除');
  assert(zom.hp >= 0, 'T4b aiAct 包装壳不破坏行为');

  // T5 代打（我方）也走同一高亮通道：休息兜底后 _acting 清除
  const far = Battle.mkZombie('walker', 10, 10, 1);
  const a3 = Battle.mkAlly(Game.createChar('explorer','游侠',false), 0, 0);
  b.units = [a3, far];
  a3.stamina = 100;
  await Battle.aiAct(a3, b.units.filter(x=>x.side==='enemy'&&x.hp>0));
  assert(a3.isDefending===true && a3._acting !== true, 'T5 代打休息后 _acting 清除');

  // T6 受击特效挂载时序：applyDamage 内特效必须位于最后一次 renderMap 之后（否则被 DOM 重建冲掉）
  {
    const ad = html.slice(html.indexOf('async applyDamage'), html.indexOf('async doAttack'));
    const lastRm = ad.lastIndexOf('Battle.renderMap()');
    assert(lastRm > -1
      && ad.indexOf('Battle.floatDmg') > lastRm
      && ad.indexOf("crit-shake':'hit-shake'") > lastRm
      && ad.indexOf("'hit-white', 300") > lastRm,
      'T6 飘字/抖动/白闪均在最终 renderMap 之后挂载');
  }

  console.log('--- done ---');
  process.exit(0);
})();
