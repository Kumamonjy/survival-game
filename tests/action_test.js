/* V74 行动模型：防御→休息（保留减伤）+ 攻击/技能后可移动 + 金币拾取上调 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
const toasts = [];
UI.toast = m => toasts.push(m);

function mkB(units){
  return { units, selected:units[0], terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
}

(async () => {
  Game.g = Game.newGame(); Game.currentSlot = 1;
  const a1 = Game.createChar('soldier', '甲'), a2 = Game.createChar('scout', '乙');

  // ===== T1 攻击后仍可移动 =====
  const u1 = Battle.mkAlly(a1, 5, 5);
  Battle.b = mkB([u1]);
  Battle.b.selected = u1;
  u1.hasAttacked = true;                       // 模拟已攻击/放完技能（endSupport 置位，hasMoved 仍 false）
  Battle.cmdMove();
  assert(Battle.b.mode==='move' && Battle.b.moveSet && Object.keys(Battle.b.moveSet).length>1, 'T1a 攻击后 cmdMove 可进入移动模式');
  assert(!toasts.some(t=>t.includes('已行动完毕')), 'T1b 不再提示「已行动完毕」拦截');

  // ===== T2 技能结算后（endSupport）仍可移动 =====
  const u2 = Battle.mkAlly(a2, 5, 5);
  Battle.b = mkB([u2]);
  Battle.b.selected = u2;
  u2.stamina = 50;
  Battle.b.pendingSkill = { name:'测试回复', cost:10, cd:0, type:'regen', regenAmt:10 };
  await Battle.endSupport(u2);                 // 技能统一收尾：置 hasAttacked
  assert(u2.hasAttacked===true && u2.hasMoved===false, 'T2a endSupport 只置 hasAttacked');
  Battle.cmdMove();
  assert(Battle.b.mode==='move' && Battle.b.moveSet && Object.keys(Battle.b.moveSet).length>1, 'T2b 技能后仍可移动');

  // ===== T3 攻击唯一性：攻击后不能再次攻击/休息 =====
  toasts.length = 0;
  const st2 = u2.stamina;
  Battle.cmdAttack();
  assert(toasts.some(t=>t.includes('已攻击过')), 'T3a 攻击后不能再次攻击');
  Battle.cmdDefend();
  assert(u2.stamina===st2 && !u2.isDefending, 'T3b 攻击后不能休息（防白嫖体力）');
  assert(html.includes('原地休息，恢复 4 点体力'), 'T3c 战报文案为休息回体力');

  // ===== T4 休息：回 4 体力 + 标记 + 行动结束 =====
  const u3 = Battle.mkAlly(a1, 5, 5);
  Battle.b = mkB([u3]);
  Battle.b.selected = u3;
  u3.stamina = 50;
  Battle.cmdDefend();
  assert(u3.stamina===54 && u3.isDefending===true && u3.hasMoved && u3.hasAttacked, 'T4a 休息 +4⚡ 并结束行动');
  assert(html.includes('onclick="Battle.cmdDefend()">休息<') && !html.includes('cmdDefend()">防御<'), 'T4b 按钮文案为「休息」');

  // ===== T5 减伤保留 =====
  assert(html.includes("if (def.isDefending) dmg = Math.max(1, Math.round(dmg*0.5));"), 'T5 休息保留受击减半');

  // ===== T6 UI 标签：攻击后未移动 → 「已攻击 · 还可移动」 =====
  const u4 = Battle.mkAlly(a2, 5, 5);
  Battle.b = mkB([u4]);
  Battle.b.selected = u4;
  u4.hasAttacked = true;
  Battle.renderInfo(u4);
  const info = elems['b-unitinfo'].innerHTML;
  assert(info.includes('已攻击 · 还可移动'), 'T6a 攻击后提示还可移动');
  u4.hasMoved = true;
  Battle.renderInfo(u4);
  assert(elems['b-unitinfo'].innerHTML.includes('行动完毕') && !elems['b-unitinfo'].innerHTML.includes('还可移动'), 'T6b 移动后显示行动完毕');
  assert(html.includes("(u.side==='ally'&&u.hasAttacked&&u.hasMoved)?'acted':''"), 'T6c 攻击后未移动不置灰');

  // ===== T7 全员行动完毕判定（攻击+移动都完成才提示） =====
  toasts.length = 0;
  const u5 = Battle.mkAlly(a1, 4, 4), u6 = Battle.mkAlly(a2, 6, 6);
  Battle.b = mkB([u5, u6]);
  u5.hasAttacked = true; u6.hasAttacked = true;   // 都攻击了但都没移动
  Battle.checkAllActed();
  assert(!toasts.some(t=>t.includes('全员行动完毕')), 'T7a 攻击完但未移动不提示全员完毕');
  u5.hasMoved = true; u6.hasMoved = true;
  Battle.checkAllActed();
  assert(toasts.some(t=>t.includes('全员行动完毕')), 'T7b 攻击+移动全毕才提示');

  // ===== T8 金币拾取上调 =====
  assert(html.includes("k==='gold' ? rnd(2,7)"), 'T8a 物资堆金币 2~7');
  assert(html.includes("gold:[3,7]"), 'T8b 废墟金币 3~7');

  // ===== T9 字幕 20 字/行 =====
  Battle.b = { speed:1 };
  Battle.subtitle('一二三四五六七八九十甲乙丙丁戊己庚辛壬子丑寅卯');
  assert([...elems['battle-subtitle'].innerHTML.split('<br>')[0]].length===20, 'T9 首行 20 字');

  // ===== T10 代打：移动后仍无普攻目标 → 休息 =====
  const a3 = Game.createChar('explorer', '游侠', false);   // move 3 / range 1
  const u7 = Battle.mkAlly(a3, 5, 5);
  const far = Battle.mkZombie('walker', 5, 10, 1);         // 距离 5，走 3 格后仍差 2 格打不到
  Battle.b = mkB([u7, far]);
  u7.stamina = 100;
  await Battle.aiAct(u7, Battle.b.units.filter(x=>x.side==='enemy'&&x.hp>0));
  assert(u7.isDefending===true && u7.stamina===104, `T10a 走位后无目标 → 休息 +4⚡（剩 ${u7.stamina}）`);
  assert(u7.hasMoved && u7.hasAttacked, 'T10b 休息后本回合行动结束');
  assert((u7.row!==5 || u7.col!==5) && Battle.manhattan(u7, far)===2, 'T10c 已朝敌人走位 3 格（距离 5→2）');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
