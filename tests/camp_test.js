/* V123 营地场景化建筑页：大营地贴图（未建造置灰）+ 点击建筑显示功能卡 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 场景渲染：7 个建筑贴图 + 装饰
  UI.campSel = null;
  UI.renderBuild();
  let bp = elems['build-page'].innerHTML;
  assert((bp.match(/class="camp-b/g)||[]).length===7, 'T1a 场景含 7 个建筑贴图');
  assert(bp.includes('🍳') && bp.includes('🛏️') && bp.includes('🏋️') && bp.includes('🏭') && bp.includes('🌾') && bp.includes('🏥') && bp.includes('🧪'), 'T1b 七建筑图标齐备');
  assert(bp.includes('camp-sun') && bp.includes('camp-fire'), 'T1c 场景装饰（太阳/篝火）');

  // T2 新档全未建造：全部置灰 + 待建造角标，无 Lv
  assert((bp.match(/camp-b off/g)||[]).length===7, 'T2a 新档 7 建筑全部置灰');
  assert((bp.match(/待建造/g)||[]).length===7 && !/clv/.test(bp), 'T2b 全部显示待建造且无等级');

  // T3 默认提示：无选中时不渲染任何功能按钮
  assert(bp.includes('点击营地中的建筑'), 'T3a 默认引导提示');
  assert(!bp.includes('buildKitchen') && !bp.includes('openCraftModal'), 'T3b 未选中不渲染功能卡');

  // T4 点击建筑 → 显示对应功能卡 + 贴图选中态
  UI.campSel = 'kitchen'; UI.renderBuild();
  bp = elems['build-page'].innerHTML;
  assert(bp.includes('Game.buildKitchen()') && bp.includes('烤面包'), 'T4a 点击厨房显示厨房卡（含建造按钮）');
  assert(/class="camp-b[^"]*sel"/.test(bp), 'T4b 贴图选中态高亮');
  assert((bp.match(/camp-b off/g)||[]).length===7, 'T4c 厨房仍未建造保持置灰');

  // T5 建造后：贴图恢复彩色 + 显示 Lv，卡变功能态
  g.kitchenLv = 2; g.res.gold = 1000;
  UI.renderBuild();
  bp = elems['build-page'].innerHTML;
  assert((bp.match(/camp-b off/g)||[]).length===6, 'T5a 建造后厨房不再置灰（其余 6 个置灰）');
  assert(bp.includes('Lv.2'), 'T5b 贴图显示等级');
  assert(bp.includes('Game.upgradeKitchen()') && bp.includes('未指派厨师'), 'T5c 厨房卡为功能态（升级/当值提示）');

  // T6 工坊选中：三功能按钮
  g.workshopLv = 1;
  UI.campSel = 'workshop'; UI.renderBuild();
  bp = elems['build-page'].innerHTML;
  assert(bp.includes('openCraftModal') && bp.includes('openUpgradeModal') && bp.includes('openSalvageModal'), 'T6 工坊卡三功能按钮');

  // T7 医院/实验室选中：生产按钮走 canProduce
  g.hospitalLv = 1; g.labLv = 1;
  UI.campSel = 'hospital'; UI.renderBuild();
  bp = elems['build-page'].innerHTML;
  assert(bp.includes('makeBandage') && bp.includes('生产急救丸'), 'T7a 医院卡生产按钮');
  UI.campSel = 'lab'; UI.renderBuild();
  bp = elems['build-page'].innerHTML;
  assert(bp.includes('makeAntidote'), 'T7b 实验室卡生产按钮');

  // T8 点击切换（模拟 onclick 流程）
  UI.campSel = 'dorm'; UI.renderBuild();
  assert(elems['build-page'].innerHTML.includes('Game.buildDorm()'), 'T8 切换到寝室卡');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
