/* V109 仓库改版：资源栏去文字 / 物品模块（已穿戴+卸下、背包装备+穿戴、道具+携带） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 主界面资源栏不再显示文字标签
  UI.renderHome();
  const resBar = html.match(/<div class="res-bar">[\s\S]*?<\/div>\s*<\/div>/);
  assert(resBar && !resBar[0].includes('<small>'), 'T1 资源栏仅图标+数字（无文字标签）');
  assert(elems['res-gold'] && elems['res-wood'], 'T1b 资源栏数值元素正常渲染');

  // T2 物品模块：新档自带布衣/布鞋（背包装备）与石块（背包道具）
  UI.openInv();
  const inv = elems['inv-list'].innerHTML;
  assert(inv.includes('物品模块') && inv.includes('背包装备'), 'T2a 物品模块分区渲染');
  assert(inv.includes('布衣') && inv.includes('布鞋') && inv.includes('穿戴'), 'T2b 背包装备带穿戴按钮');
  assert(inv.includes('石块') && inv.includes('携带'), 'T2c 背包道具带携带按钮');

  // T3 穿戴流程：addEquip 木弓 → invPickChar 弹窗 → invEquipTo 上身
  Game.addEquip('bow', 1);
  UI.renderInv();
  const uid = g.bagInst.find(e=>e.id==='bow').uid;
  const c1 = g.chars[0];
  UI.invPickChar(uid);   // 弹窗（内容写入 modal 容器，流程可用性由下一步验证）
  UI.invEquipTo(c1.id, uid);
  assert(c1.equip.weapon && c1.equip.weapon.id==='bow' && c1.equip.weapon.uid===uid, 'T3a 仓库一键穿戴成功');
  assert(!(g.bagInst||[]).some(e=>e.uid===uid), 'T3b 装备离开背包');
  UI.renderInv();
  assert(elems['inv-list'].innerHTML.includes('穿戴中') && elems['inv-list'].innerHTML.includes(c1.name), 'T3c 已穿戴行显示穿戴者');

  // T4 卸下流程：equipChar(null) 回包
  Game.equipChar(c1.id, 'weapon', null);
  assert((g.bagInst||[]).some(e=>e.uid===uid) && !c1.equip.weapon, 'T4 卸下后放回背包');
  UI.renderInv();
  assert(!elems['inv-list'].innerHTML.includes(c1.name + ' 穿戴中'), 'T4b 仓库同步更新');

  // T5 道具携带/放回流程
  UI.invCarryTo(c1.id, 'stone');
  assert(c1.item && c1.item.id==='stone' && c1.item.count===1, 'T5a 仓库一键携带道具');
  UI.renderInv();
  assert(elems['inv-list'].innerHTML.includes('携带中'), 'T5b 携带中分区显示');
  Game.uncarryItem(c1.id, false);
  assert(!c1.item && (g.bag.stone||0)>=1, 'T5c 放回背包');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
