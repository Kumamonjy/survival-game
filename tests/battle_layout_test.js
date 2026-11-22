/* V212 战斗界面防跳动：.b-unitinfo 固定占位（height:58px + :empty visibility:hidden），选中/取消/AI 回合时地图区域高度恒定 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;

(async () => {
  // ===== T1 信息卡固定占位 =====
  const m = html.match(/\.b-unitinfo \{[^}]+\}/);
  assert(m && m[0].includes('height:58px') && m[0].includes('overflow:hidden'), 'T1a 信息卡固定高度 58px（不再随内容伸缩）');
  assert(/\.b-unitinfo:empty \{ visibility:hidden/.test(html), 'T1b 空状态 visibility:hidden 保占位');
  assert(!/\.b-unitinfo:empty \{ display:none/.test(html), 'T1c 不再 display:none（移除旧的不占位逻辑）');

  // ===== T2 地图区域依赖信息卡高度恒定 =====
  assert(/\.map-wrap \{ flex:1/.test(html), 'T2a map-wrap flex:1 结构未变');
  assert(html.includes('cellSize()'), 'T2b cellSize 仍按容器计算（容器高度恒定后结果稳定）');

  // ===== T3 战斗界面结构完整 =====
  assert(html.includes('id="b-unitinfo"') && html.includes('id="battle-map"') && html.includes('class="b-actions"'), 'T3 战斗界面 DOM 结构完整');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
