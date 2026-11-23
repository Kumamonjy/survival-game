/* V220 战斗顶栏物资箱：战利品从我方面板迁至顶栏按钮（弹窗查看 + 拾取闪烁） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;

(async () => {
  // ===== T1 顶栏按钮与入口 =====
  assert(html.includes('<button class="loot-btn" id="btn-loot" onclick="Battle.showLoot()">🧰</button>'), 'T1a 顶栏「玩家回合」左侧新增物资箱按钮');
  assert(html.includes('.loot-btn.loot-flash') && html.includes('@keyframes lootFlash'), 'T1b 拾取闪烁动画 CSS');
  assert(html.includes('showLoot() {') && html.includes('flashLootBtn() {'), 'T1c showLoot/flashLootBtn 实现');

  // ===== T2 我方面板不再显示战利品 =====
  Battle.b = { units:[], terrain:[], ruins:{}, fire:{}, loot:{gold:5,med:2,metal:0,food:0,fabric:0,wood:0},
    turn:1, phase:'player', weather:'sunny', stats:{}, log:[], over:false, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  Battle.renderPanels();
  const allyHtml = elems['panel-ally'].innerHTML;
  assert(!allyHtml.includes('已拾取'), 'T2a 我方面板不再显示「已拾取」行');
  assert(allyHtml.includes('我方') && allyHtml.includes('总血量'), 'T2b 我方面板保留人数与总血量');

  // ===== T3 showLoot 弹窗 =====
  const modals = [];
  const origModal = UI.modal.bind(UI);
  UI.modal = h => { modals.push(String(h)); origModal(h); };
  Battle.showLoot();
  assert(modals[0].includes('已拾取物资') && modals[0].includes('金币') && modals[0].includes('×5') && modals[0].includes('×2'), 'T3a 有战利品时逐项列出数量');
  Battle.b.loot = {gold:0,med:0,metal:0,food:0,fabric:0,wood:0};
  Battle.showLoot();
  assert(modals[1].includes('还没有拾取物资'), 'T3b 无战利品时显示引导文案');
  Battle.renderPanels();   // 模拟新一场战斗开局：loot 归零后先渲染同步基线（_lootSum=0）

  // ===== T4 拾取闪烁 =====
  Battle.b.loot.gold += 3;
  Battle.renderPanels();
  assert(elems['btn-loot'] && elems['btn-loot'].classList.contains('loot-flash'), 'T4a 拾取后按钮获得 loot-flash');
  let flashed = 0;
  Battle.flashLootBtn = () => { flashed++; };
  Battle.b.loot.med += 1;
  Battle.renderPanels();
  assert(flashed === 1, 'T4b 再次拾取再次闪烁');
  Battle.renderPanels();
  assert(flashed === 1, 'T4c 无变化不重复闪烁');
  Battle.b.loot.gold -= 2;
  Battle.renderPanels();
  assert(flashed === 1, 'T4d loot 只减不增不触发（方向校验）');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
