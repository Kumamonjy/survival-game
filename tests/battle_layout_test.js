/* V212 战斗界面防跳动 + V247 悬浮展开层：.b-unitinfo 永久锁死 58px（展开详情走 absolute 悬浮层不占布局），选中/取消/展开收起/AI 回合时地图区域高度与位置恒定 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;

(async () => {
  // ===== T1 信息卡固定占位 =====
  const m = html.match(/\.b-unitinfo \{[^}]+\}/);
  assert(m && m[0].includes('height:58px') && !m[0].includes('overflow:hidden'), 'T1a 信息卡固定高度 58px（悬浮层需要 overflow 可见）');
  assert(!/\.b-unitinfo\.open\s*\{[^}]*height:auto/.test(html), 'T1a-b 展开态不再改变容器高度（V246 回归）');
  assert(/\.b-unitinfo:empty \{ visibility:hidden/.test(html), 'T1b 空状态 visibility:hidden 保占位');
  assert(!/\.b-unitinfo:empty \{ display:none/.test(html), 'T1c 不再 display:none（移除旧的不占位逻辑）');

  // ===== T2 地图区域依赖信息卡高度恒定 =====
  assert(/\.map-wrap \{ flex:1/.test(html), 'T2a map-wrap flex:1 结构未变');
  assert(html.includes('cellSize()'), 'T2b cellSize 仍按容器计算（容器高度恒定后结果稳定）');

  // ===== T3 战斗界面结构完整 =====
  assert(html.includes('id="b-unitinfo"') && html.includes('id="battle-map"') && html.includes('class="b-actions"'), 'T3 战斗界面 DOM 结构完整');

  // ===== T4 展开详情为 absolute 悬浮层（不占布局 → 地图零位移） =====
  const mx = html.match(/\.b-unitinfo \.u-extra \{[^}]+\}/);
  assert(mx && mx[0].includes('position:absolute') && mx[0].includes('z-index'), 'T4a u-extra 悬浮层 absolute+置顶');
  assert(/\.b-unitinfo\.open \.u-extra \{ display:block/.test(html), 'T4b open 态展示悬浮层');

  // ===== T5 行为：清空单位时同步摘除 open 类（防空栏塌缩） =====
  const el = document.getElementById('b-unitinfo');
  el.classList.add('open'); el.innerHTML = 'x';
  Battle.infoOpen = false;
  Battle.renderInfo(null);
  assert(el.innerHTML==='' && !el.classList.contains('open'), 'T5 renderInfo(null) 清空内容并摘除 open 类');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
