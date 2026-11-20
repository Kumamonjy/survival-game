/* V123 营地场景化建筑页：大营地贴图（未建造置灰）+ 点击建筑显示功能卡 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 场景渲染：3 列建筑网格（7 建筑 + 招募/职务），无装饰元素
  UI.campSel = null;
  UI.renderBuild();
  let bp = elems['build-page'].innerHTML;
  assert((bp.match(/class="camp-tile/g)||[]).length===9, 'T1a 场景为 9 格网格（7 建筑 + 招募/职务）');
  assert(bp.includes('🍳') && bp.includes('🛏️') && bp.includes('🏋️') && bp.includes('🏭') && bp.includes('🌾') && bp.includes('🏥') && bp.includes('🧪'), 'T1b 七建筑图标齐备');
  assert(bp.includes('camp-grid') && !bp.includes('camp-sun') && !bp.includes('camp-deco') && !bp.includes('camp-fire'), 'T1c 无太阳/树/帐篷/砖墙/篝火等装饰');

  // T2 新档全未建造：全部置灰 + 待建造角标，无 Lv
  assert((bp.match(/camp-tile off/g)||[]).length===7, 'T2a 新档 7 建筑全部置灰');
  assert((bp.match(/待建造/g)||[]).length===7 && !/clv/.test(bp), 'T2b 全部显示待建造且无等级');

  // T3 默认提示：无选中时不渲染任何功能按钮
  assert(bp.includes('点击营地中的建筑'), 'T3a 默认引导提示');
  assert(!bp.includes('buildKitchen') && !bp.includes('openCraftModal'), 'T3b 未选中不渲染功能卡');

  // T4 点击建筑 → 显示对应功能卡 + 贴图选中态
  UI.campSel = 'kitchen'; UI.renderBuild();
  bp = elems['build-page'].innerHTML;
  assert(bp.includes('Game.buildKitchen()') && bp.includes('烤面包'), 'T4a 点击厨房显示厨房卡（含建造按钮）');
  assert(/class="camp-tile[^"]*sel"/.test(bp), 'T4b 建筑选中态高亮');
  assert((bp.match(/camp-tile off/g)||[]).length===7, 'T4c 厨房仍未建造保持置灰');

  // T5 建造后：贴图恢复彩色 + 显示 Lv，卡变功能态
  g.kitchenLv = 2; g.res.gold = 1000;
  UI.renderBuild();
  bp = elems['build-page'].innerHTML;
  assert((bp.match(/camp-tile off/g)||[]).length===6, 'T5a 建造后厨房不再置灰（其余 6 个置灰）');
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

  // T9 医院/实验室可升级：卡内含升级按钮 + 等级显示
  g.hospitalLv = 1; g.labLv = 1; g.res.gold = 9999;
  UI.campSel = 'hospital'; UI.renderBuild();
  let bh = elems['build-page'].innerHTML;
  assert(bh.includes("Game.upgradeBuilding('hospital')") && bh.includes('医院 Lv.1'), 'T9a 医院卡含升级按钮与等级');
  assert(bh.includes('生产绷带（10⚡'), 'T9b Lv1 绷带仍 10⚡');
  UI.campSel = 'lab'; UI.renderBuild();
  bh = elems['build-page'].innerHTML;
  assert(bh.includes("Game.upgradeBuilding('lab')") && bh.includes('实验室 Lv.1'), 'T9c 实验室卡含升级按钮与等级');

  // T10 升级后生产体力递减：医院 Lv3 绷带 10→6⚡，实验室 Lv3 解毒针 15→11⚡
  g.hospitalLv = 3; g.labLv = 3;
  assert(Game.produceStamina(DATA.PRODUCE.bandage, 'hospitalLv')===6, 'T10a 医院 Lv3 绷带 6⚡');
  assert(Game.produceStamina(DATA.PRODUCE.antidote, 'labLv')===11, 'T10b 实验室 Lv3 解毒针 11⚡');
  g.hospitalLv = 5;
  assert(Game.produceStamina(DATA.PRODUCE.bandage, 'hospitalLv')===5, 'T10c 最低 5⚡');
  assert(Game.produceStamina(DATA.PRODUCE.firstaid, 'kitchenLv')===15, 'T10d 非医院/实验室不受影响');

  // T11 实际生产按等级扣体力
  const doc = Game.createChar('doctor','医生甲'); doc.stamina = 100; doc.injured = false; g.chars.push(doc);
  g.hospitalDoc = doc.id; g.res.fabric = 10; g.res.med = 10;
  g.hospitalLv = 3;
  Game.makeBandage();
  assert(doc.stamina === 100 - 6, `T11 医院 Lv3 生产绷带实扣 6⚡（余 ${doc.stamina}）`);

  // T12 所有地图开局即解锁
  g.day = 1; UI.openZones();
  let zh = elems['zone-list'].innerHTML;
  assert((zh.match(/zone-card locked/g)||[]).length===0, 'T12a 第1天无锁定区域');
  assert(!zh.includes('🔒') && !zh.includes('解锁'), 'T12b 不显示锁与解锁天数');
  assert((zh.match(/zone-card"/g)||[]).length===DATA.ZONES.length, 'T12c 全部区域可点击进入');
  assert(zh.includes('⛽') && zh.includes('🌲') && zh.includes('🎖️'), 'T12d 加油站/林场/基地均出现在列表');

  // T13 主界面即营地（方案B）：建筑场景并入首页，独立建筑页移除
  assert(html.includes('id="build-page"') && html.includes('id="home-body"'), 'T13a 首页内嵌营地场景容器');
  assert(!html.includes('id="scr-build"'), 'T13b 独立建筑页已移除');
  assert(bp.includes('camp-grid'), 'T13c 首页使用营地建筑网格');

  // T14 场景热点：大门/仓库/人物/招募/职务，且大门为主 CTA
  ["UI.openZones()","UI.openInv()","UI.openChars()","UI.openRecruit()","UI.openDuty()"].forEach(fn=>{
    assert(bp.includes(fn), `T14 场景热点 ${fn}`);
  });
  assert(/camp-spot main[^>]*onclick="UI.openZones\(\)"/.test(bp), 'T14b 外出探险为大门主热点');

  // T15 访客热点按状态显隐
  g.visitors = null; UI.renderBuild();
  assert(!elems['build-page'].innerHTML.includes('今日到访'), 'T15a 无访客时不显示访客热点');
  g.visitors = { day:g.day, merchant:null, wanderer:null }; UI.renderBuild();
  assert(elems['build-page'].innerHTML.includes('今日到访') && elems['build-page'].innerHTML.includes('UI.openVisitors()'), 'T15b 有访客时出现热点');
  g.visitors = null; UI.renderBuild();

  // T16 重伤角标 + 天气压暗
  g.chars[0].injured = true; UI.renderBuild();
  assert(elems['build-page'].innerHTML.includes('1 重伤'), 'T16a 营地热点显示重伤数');
  g.chars[0].injured = false;
  g.weather = 'rain'; UI.renderBuild();
  assert(elems['home-camp-scene'].style.filter.includes('brightness'), 'T16b 雨天场景压暗');
  g.weather = 'sunny'; UI.renderBuild();

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
