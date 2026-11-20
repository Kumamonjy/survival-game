/* V86 工坊升级：每级 -10% 材料消耗（向上取整），适用于打造与装备升级 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
  { // V110 工坊当值：指派专属工匠（独立角色，避免污染既有体力断言）
    const sm = Game.createChar('civilian','工匠甲'); sm.stamina = 9999; sm.injured = false;
    Game.g.chars.push(sm); Game.g.workshopLv = Math.max(Game.g.workshopLv||0, 1);
    Game.assignWorkshop(sm.id);
  }
const g = Game.g;

(() => {
  // T1 工坊可升级配置
  assert(DATA.WORKSHOP.maxLv===5 && DATA.WORKSHOP.upgradeCost===200 && DATA.WORKSHOP.buildCost===130, 'T1a 工坊 maxLv5 / 建造 130 / 升级基准 200💰');
  assert(DATA.WORKSHOP.desc.includes('10%'), 'T1b 描述含折扣说明');

  // T2 Lv1 无折扣（木棍 20💰+5🪵）
  g.workshopLv = 1;
  const c1 = Game.craftCost('stick');
  assert(c1.gold===20 && c1.wood===5, 'T2a Lv1 无折扣：木棍 20💰+5🪵');
  const u1 = Game.craftCost('stick', 1);   // 升 +1：×2 无折扣
  assert(u1.gold===40 && u1.wood===10, 'T2b Lv1 装备升级 +1：40💰+10🪵');

  // T3 Lv2 -10%：打造 ceil(20×0.9)=18💰 / ceil(5×0.9)=5🪵
  g.res.gold = 1000; g.res.wood = 100; g.res.metal = 100; g.res.fabric = 100;
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===2, 'T3a 升工坊 Lv2');
  const c2 = Game.craftCost('stick');
  assert(c2.gold===18 && c2.wood===5, `T3b Lv2 打造：18💰+5🪵（${c2.gold}+${c2.wood}）`);
  g.res.gold = 500; g.res.wood = 50;
  const gold0 = g.res.gold, wood0 = g.res.wood;
  Game.craft('stick');
  const inst = g.bagInst[g.bagInst.length-1];
  assert(g.res.gold===gold0-18 && g.res.wood===wood0-5 && inst.id==='stick', 'T3c 实扣 18💰+5🪵');

  // T4 Lv2 装备升级折扣：+1（当前级0，系数×1）= ceil(20×0.9)=18💰 / ceil(5×0.9)=5🪵
  Game.upgradeEquip(inst.uid);
  assert(inst.lv===1 && g.res.gold===gold0-18-18 && g.res.wood===wood0-5-5, `T4 Lv2 升级 +1 实扣 18💰+5🪵`);

  // T5 Lv3 -20%：打造 ceil(20×0.8)=16💰 / ceil(5×0.8)=4🪵
  g.res.gold = 1000;
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===3, 'T5a 升工坊 Lv3');
  const c3 = Game.craftCost('stick');
  assert(c3.gold===16 && c3.wood===4, `T5b Lv3 打造：16💰+4🪵（${c3.gold}+${c3.wood}）`);
  const c3b = Game.craftCost('stick', 1);
  assert(c3b.gold===32 && c3b.wood===8, `T5c Lv3 升 +1→+2（级数×2）：ceil(40×0.8)=32💰 / ceil(10×0.8)=8🪵（${c3b.gold}+${c3b.wood}）`);
  const c3c = Game.craftCost('stick', 0);
  assert(c3c.gold===16 && c3c.wood===4, 'T5d Lv3 装备升级 +1（当前级0）：16💰+4🪵');

  // T6 UI 弹窗显示折扣
  g.res.gold = 500; g.res.metal = 50;
  UI.openCraftModal();
  const ch = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(ch.includes('工坊 Lv.3') && ch.includes('-20%'), 'T6a 打造弹窗显示折扣');
  assert(ch.includes('×16'), 'T6b 打造弹窗显示折后成本');
  UI.openUpgradeModal();
  const uh = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(uh.includes('已含工坊折扣 -20%'), 'T6c 升级弹窗显示折扣');

  // T7 工坊卡：Lv3 显示折扣标签且仍可升级
  UI.campSel='workshop';
  UI.renderBuild();
  const bh = elems['build-page'].innerHTML;
  assert(bh.includes('材料 -20%') && bh.includes('升级到 Lv.4'), 'T7 工坊卡折扣标签 + 升级按钮');

  // T8 Lv4 -30% → Lv5 -40% → 满级拦截（升级费 ×(1+0.5×等级)：Lv3→4 收 2.5×200=500，Lv4→5 收 3×200=600）
  g.res.gold = 2500;
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===4 && g.res.gold===2000, 'T8a 升工坊 Lv4 扣 500');
  const c4 = Game.craftCost('stick');
  assert(c4.gold===14 && c4.wood===4, `T8b Lv4 打造 -30%：ceil(20×0.7)=14💰+ceil(5×0.7)=4🪵（${c4.gold}+${c4.wood}）`);
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===5, 'T8c 升工坊 Lv5');
  const c5 = Game.craftCost('stick');
  assert(c5.gold===12 && c5.wood===3, `T8d Lv5 打造 -40%：ceil(20×0.6)=12💰+ceil(5×0.6)=3🪵（${c5.gold}+${c5.wood}）`);
  Game.upgradeBuilding('workshop');
  assert(g.workshopLv===5, 'T8e Lv5 为上限');
  UI.campSel='workshop';
  UI.renderBuild();
  assert(elems['build-page'].innerHTML.includes('材料 -40%'), 'T8f Lv5 卡折扣标签');

  console.log('--- done ---');
  process.exit(0);
})();
