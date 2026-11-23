/* V223 丧尸潮预警改为纯通知事件（删除 A/B 选项），里程碑弹窗支持无选项事件 */
const { setup, assert } = require('./_helper.js');
const { Game, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 事件数据：丧尸潮预警无选项，其余 4 个均为 2 选 1 =====
  const horde = DATA.MILESTONES.find(m=>m.t==='丧尸潮预警');
  assert(horde && !horde.a && !horde.b, 'T1a 丧尸潮预警已删除 A/B 选项');
  assert(horde.d.includes('一大群丧尸'), 'T1b 保留预警文案');
  assert(DATA.MILESTONES.filter(m=>m.a&&m.b).length===4, 'T1c 其余里程碑仍为 2 选 1');

  // ===== T2 纯通知事件渲染「收到」按钮（无 A./B.） =====
  g.day = 10; g.seenMilestones = DATA.MILESTONES.filter(m=>m.t!=='丧尸潮预警').map(m=>m.t);
  UI.checkMilestone();
  const m1 = elems['modal-body'].innerHTML;
  assert(m1.includes('丧尸潮预警') && m1.includes('收到'), 'T2a 预警弹窗只有「收到」按钮');
  assert(!m1.includes('A. ') && !m1.includes('B. '), 'T2b 不再显示 A/B 选项');

  // ===== T3 收到 → 直接关闭，无副作用 =====
  const gold0 = g.res.gold, food0 = g.res.food;
  UI.pickMilestone(0);
  assert(!g.seenMilestones.includes('丧尸潮预警')===false && g.res.gold===gold0 && g.res.food===food0, 'T3a 纯通知无资源副作用');
  assert(!elems['modal-mask'].classList.contains('show'), 'T3b 点击后弹窗关闭');
  assert(UI._milestone===null, 'T3c 里程碑状态已清');

  // ===== T4 普通里程碑仍渲染 A/B =====
  g.day = 20; g.seenMilestones = DATA.MILESTONES.filter(m=>!m.a).map(m=>m.t);
  UI.checkMilestone();
  const m2 = elems['modal-body'].innerHTML;
  assert(m2.includes('A. ') && m2.includes('B. '), 'T4 普通 2 选 1 事件不受影响');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
