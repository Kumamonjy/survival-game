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
  assert(R('club')===29 && R('spear')===51 && R('shovel')===54 && R('fireaxe')===58, 'T2b 武器锚点 29/51/54/58（V229 高级装备金币 ×1.15）');
  assert(R('woodshield')===45 && R('hammer')===47 && R('compoundbow')===100 && R('pistol')===104, 'T2c 武器锚点 木盾45/大铁锤47/复合弓100（V234 射程4 成本上调）/手枪104');
  assert(R('cap')===13 && R('chood')===21 && R('helmet')===35, 'T2d 头部锚点 13/21/35（V226）');
  assert(R('cloth')===31 && R('sportvest')===42 && R('bikini')===45 && R('sweater')===48 && R('paddedcoat')===88 && R('cshoes')===20, 'T2e 护甲/鞋子锚点 布衣31/运动背心42/比基尼45/毛衣48/棉袄88/布鞋20（V236 护甲线扩充）');
  assert(R('cottonshoes')===37 && R('rainboots')===39 && R('heels')===40 && R('sneakers')===85, 'T2g 鞋子线锚点 棉鞋37/雨靴39/高跟鞋40/运动鞋85(TOP·移+1)（V237）');
  assert(R('bracer')===10 && R('bottle')===10 && R('thermos')===18, 'T2f 饰品锚点 10/10/18（V226）');

  // ===== T3 权重体系一致性抽查：射程3 卖得比同级近战贵 =====
  assert(R('compoundbow') > R('hammer'), 'T3a 复合弓(射程3,95) > 大铁锤(攻高,70)：射程溢价成立');
  assert(R('pistol') > R('compoundbow'), 'T3b 手枪仍为全场最贵');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
