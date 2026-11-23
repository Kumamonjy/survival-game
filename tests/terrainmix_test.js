/* V93 区域特色地形：5 区域配方 + start 按配方散布 + 区域卡展示 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store, mkEl } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 配方数据
  const EXP = { market:{water:10,rubble:8,ruin:6,crate:8,barrel:1,iceN:2},
    gas:{water:4,rubble:9,ruin:5,crate:7,barrel:24},
    hospital:{water:6,rubble:8,ruin:10,crate:7,barrel:2,iceN:7},
    forest:{water:6,rubble:20,ruin:8,crate:5,barrel:3},
    camp:{water:7,rubble:6,ruin:4,crate:4,barrel:10},
    factory:{water:4,rubble:15,ruin:8,crate:4,barrel:10,iceN:12}, street:{water:6,rubble:10,ruin:14,crate:6,barrel:3,iceN:2},
    base:{water:6,rubble:14,ruin:12,crate:5,barrel:6,iceN:9} };
  assert(DATA.ZONES.length===8 && DATA.ZONES.every(z=>JSON.stringify(z.terrain)===JSON.stringify(EXP[z.id])), 'T1 八区域地形配方正确');

  // T2 start 按配方散布：工厂应出现 10 桶
  const c = Game.createChar('soldier','兵',false); g.chars.push(c);
  UI.teamSelected = [c.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='factory'));
  const cnt = t => Battle.b.terrain.flat().filter(x=>x===t).length;
  assert(cnt('barrel')===10, `T2a 工厂 10 桶（实际 ${cnt('barrel')}）`);
  assert(cnt('rubble')===15 && cnt('water')===4 && cnt('crate')===4, `T2b 工厂 rubble15/water4/crate4（${cnt('rubble')}/${cnt('water')}/${cnt('crate')}）`);
  const ruined = Battle.b.ruins && Object.keys(Battle.b.ruins).length;
  assert(ruined===8, `T2c 废墟翻找点 8（${ruined}）`);

  // T3 换区域：医院积水 12、超市物资箱 8
  UI.teamSelected = [c.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='hospital'));
  assert(cnt('water')===6 && cnt('ruin')===10 && cnt('barrel')===2, `T3a 医院 water6/ruin10/barrel2（${cnt('water')}/${cnt('ruin')}/${cnt('barrel')}）`);
  UI.teamSelected = [c.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='market'));
  assert(cnt('crate')===8 && cnt('barrel')===1, `T3b 超市 crate8/barrel1（${cnt('crate')}/${cnt('barrel')}）`);

  // T4 老存档兼容：zone 快照无 terrain 字段 → 按 id 回查 DATA.ZONES（真实老存档是完整快照，只缺新增的 terrain）
  const full = DATA.ZONES.find(z=>z.id==='base');
  const stale = { ...full }; delete stale.terrain;
  UI.teamSelected = [c.id];
  await Battle.start(stale);
  assert(cnt('barrel')===6 && cnt('ruin')===12, `T4 老存档快照回查配方 barrel6/ruin12（${cnt('barrel')}/${cnt('ruin')}）`);

  // T5 区域卡展示战场地形行（全部区域开局即可进入）
  elems['zone-list'] = mkEl();
  UI.openZones();
  assert(elems['zone-list'].innerHTML.includes('战场地形') && elems['zone-list'].innerHTML.includes('🛢️</span>10'), 'T5 区域卡展示地形配方（油桶红化）');

  Battle.exit ? null : null;
  console.log('--- done ---');
  process.exit(0);
})();
