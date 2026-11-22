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
  assert(R('stick')===19 && R('dagger')===29 && R('cleaver')===34 && R('nunchaku')===36, 'T2a 武器锚点 19/29/34/36');
  assert(R('club')===43 && R('spear')===58 && R('shovel')===62 && R('fireaxe')===67, 'T2b 武器锚点 43/58/62/67');
  assert(R('woodshield')===68 && R('hammer')===70 && R('compoundbow')===95 && R('pistol')===110, 'T2c 武器锚点 木盾68/大铁锤70/复合弓95/手枪110');
  assert(R('cap')===20 && R('chood')===32 && R('helmet')===53, 'T2d 头部锚点 20/32/53');
  assert(R('cloth')===46 && R('sweater')===72 && R('cshoes')===30, 'T2e 护甲/鞋子锚点 46/72/30');
  assert(R('cottonshoes')===55 && R('rainboots')===58, 'T2g 鞋子升级线锚点 棉鞋55/雨靴58（def 溢价 > hp 溢价）');
  assert(R('bracer')===16 && R('bottle')===16 && R('thermos')===28, 'T2f 饰品锚点 16/16/28');

  // ===== T3 权重体系一致性抽查：射程3 卖得比同级近战贵 =====
  assert(R('compoundbow') > R('hammer'), 'T3a 复合弓(射程3,95) > 大铁锤(攻高,70)：射程溢价成立');
  assert(R('pistol') > R('compoundbow'), 'T3b 手枪仍为全场最贵');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
