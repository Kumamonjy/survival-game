/* V86 工坊升级：每级 -10% 材料消耗（向上取整），适用于打造与装备升级
 * V176 派生化：期望值从 REC('stick') 生成——调价只改 DATA.RECIPES，本测试零改动；折扣公式变化才会拦截 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store, REC, CC, FM, SB } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
  { // V110 工坊当值：指派专属工匠（独立角色，避免污染既有体力断言）
    const sm = Game.createChar('civilian','工匠甲'); sm.stamina = 9999; sm.injured = false;
    Game.g.chars.push(sm); Game.g.workshopLv = Math.max(Game.g.workshopLv||0, 1);
    Game.assignWorkshop(sm.id);
  }
const g = Game.g;

/* 期望值派生：基价取自 RECIPES（唯一数据源），折扣/级数公式独立复刻（公式本身是被测逻辑） */
const B = REC('stick').cost;
const disc = lv => 1 - 0.1*(lv-1);
const exp = (lv, mult=1) => ({ gold: Math.ceil(B.gold*mult*disc(lv)), wood: Math.ceil(B.wood*mult*disc(lv)) });

(() => {
  // T1 工坊可升级配置
  assert(DATA.WORKSHOP.maxLv===5 && DATA.WORKSHOP.upgradeCost===200 && DATA.WORKSHOP.buildCost===130, 'T1a 工坊 maxLv5 / 建造 130 / 升级基准 200💰');
  assert(DATA.WORKSHOP.desc.includes('10%'), 'T1b 描述含折扣说明');

  // T2 Lv1 无折扣
  g.workshopLv = 1;
  const c1 = Game.craftCost('stick'), e1 = exp(1), e1u = exp(1, 2);
  assert(c1.gold===e1.gold && c1.wood===e1.wood, 'T2a Lv1 无折扣：木棍按基价');
  const u1 = Game.craftCost('stick', 1);   // 升 +1：×2 无折扣
  assert(u1.gold===e1u.gold && u1.wood===e1u.wood, 'T2b Lv1 装备升级 +1：基价×2');

  // T3 Lv2 -10%
  g.res.gold = 1000; g.res.wood = 100; g.res.metal = 100; g.res.fabric = 100;
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===2, 'T3a 升工坊 Lv2');
  const c2 = Game.craftCost('stick'), e2 = exp(2);
  assert(c2.gold===e2.gold && c2.wood===e2.wood, `T3b Lv2 打造：${c2.gold}💰+${c2.wood}🪵`);
  g.res.gold = c2.gold*2 + 100; g.res.wood = c2.wood*2 + 20;   // 预置随派生价走（打造+升级两份）
  const gold0 = g.res.gold, wood0 = g.res.wood;
  Game.craft('stick');
  const inst = g.bagInst[g.bagInst.length-1];
  assert(g.res.gold===gold0-c2.gold && g.res.wood===wood0-c2.wood && inst.id==='stick', 'T3c 实扣 = craftCost 派生值');

  // T4 Lv2 装备升级折扣：+1（当前级0，系数×1）与打造同价
  Game.upgradeEquip(inst.uid);
  assert(inst.lv===1 && g.res.gold===gold0-c2.gold-c2.gold && g.res.wood===wood0-c2.wood-c2.wood, 'T4 Lv2 升级 +1 实扣与打造同价');

  // T5 Lv3 -20%
  g.res.gold = 1000;
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===3, 'T5a 升工坊 Lv3');
  const c3 = Game.craftCost('stick'), e3 = exp(3), e3u = exp(3, 2);
  assert(c3.gold===e3.gold && c3.wood===e3.wood, `T5b Lv3 打造：${c3.gold}💰+${c3.wood}🪵`);
  const c3b = Game.craftCost('stick', 1);
  assert(c3b.gold===e3u.gold && c3b.wood===e3u.wood, `T5c Lv3 升 +1→+2（级数×2）：${c3b.gold}💰+${c3b.wood}🪵`);
  const c3c = Game.craftCost('stick', 0);
  assert(c3c.gold===e3.gold && c3c.wood===e3.wood, 'T5d Lv3 装备升级 +1（当前级0）与打造同价');

  // T6 UI 弹窗显示折扣
  g.res.gold = 500; g.res.metal = 50;
  UI.openCraftModal();
  const ch = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(ch.includes('工坊 Lv.3') && ch.includes('-20%'), 'T6a 打造弹窗显示折扣');
  UI.openCraftTab('weapon');
  const cw = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(cw.includes('×'+e3.gold), 'T6b 打造弹窗显示折后成本');
  UI.openUpgradeModal();
  const uh = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(uh.includes('已含工坊折扣 -20%'), 'T6c 升级弹窗显示折扣');

  // T7 工坊卡：Lv3 显示折扣标签且仍可升级
  UI.campSel='workshop';
  UI.renderBuild();
  const bh = elems['build-page'].innerHTML;
  assert(bh.includes('材料 -20%') && bh.includes('升级到 Lv.4'), 'T7 工坊卡折扣标签 + 升级按钮');

  // T8 Lv4 -30% → Lv5 -40% → 满级拦截（升级费 ×(1+0.3×等级)：Lv3→4 收 1.9×200=380，Lv4→5 收 2.2×200=440）
  g.res.gold = 2500;
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===4 && g.res.gold===2120, 'T8a 升工坊 Lv4 扣 380');
  const c4 = Game.craftCost('stick'), e4 = exp(4);
  assert(c4.gold===e4.gold && c4.wood===e4.wood, `T8b Lv4 打造 -30%：${c4.gold}💰+${c4.wood}🪵`);
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===5, 'T8c 升工坊 Lv5');
  const c5 = Game.craftCost('stick'), e5 = exp(5);
  assert(c5.gold===e5.gold && c5.wood===e5.wood, `T8d Lv5 打造 -40%：${c5.gold}💰+${c5.wood}🪵`);
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===5, 'T8e Lv5 为上限');
  UI.campSel='workshop';
  UI.renderBuild();
  assert(elems['build-page'].innerHTML.includes('材料 -40%'), 'T8f Lv5 卡折扣标签');

  console.log('--- done ---');
  process.exit(0);
})();
