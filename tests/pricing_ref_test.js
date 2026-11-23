/* V206 装备定价参考表契约测试：代码内定价表存在 + 价格锚点未被破坏（新装备核价依据） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定价表存在于源码（不在前端渲染，仅代码注释） =====
  assert(html.includes('装备定价参考表') && html.includes('属性权重'), 'T1a 定价表注释存在');
  assert(html.includes('射程 +1') && html.includes('移速 +1') && html.includes('攻击 +1'), 'T1b 单价换算齐全');
  assert(html.includes('破表定价') && html.includes('设计溢价'), 'T1c 破表规则在案');

  // ===== T2 价格锚点未被破坏 =====
  const R = id => { const r = DATA.RECIPES.find(x=>x.id===id); return r && r.cost.gold; };
  assert(R('stick')===13 && R('slingshot')===13 && R('whip')===19 && R('dagger')===19 && R('cleaver')===23 && R('nunchaku')===25, 'T2a 武器锚点 13/13/19/19/23/25（V226 金币下调材料大增）');
  assert(R('throwknife')===22, 'T2h 消耗品锚点 飞刀22（3格100%攻，强于石块10💰/50%；V226 消耗品不动）');
  assert(R('club')===29 && R('spear')===44 && R('shovel')===47 && R('fireaxe')===50, 'T2b 武器锚点 29/44/47/50（V226 金币下调材料大增）');
  assert(R('woodshield')===45 && R('hammer')===47 && R('compoundbow')===77 && R('pistol')===90, 'T2c 武器锚点 木盾45/大铁锤47/复合弓77/手枪90（V226 金币下调材料大增）');
  assert(R('cap')===13 && R('chood')===21 && R('helmet')===35, 'T2d 头部锚点 13/21/35（V226）');
  assert(R('cloth')===31 && R('sweater')===48 && R('cshoes')===20, 'T2e 护甲/鞋子锚点 31/48/20（V226）');
  assert(R('cottonshoes')===37 && R('rainboots')===39, 'T2g 鞋子升级线锚点 棉鞋37/雨靴39（def 溢价 > hp 溢价）');
  assert(R('bracer')===10 && R('bottle')===10 && R('thermos')===18, 'T2f 饰品锚点 10/10/18（V226）');

  // ===== T3 权重体系一致性抽查：射程3 卖得比同级近战贵 =====
  assert(R('compoundbow') > R('hammer'), 'T3a 复合弓(射程3,95) > 大铁锤(攻高,70)：射程溢价成立');
  assert(R('pistol') > R('compoundbow'), 'T3b 手枪仍为全场最贵');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
