/* V140 文案与数据一致性：工坊体力区间、百科建筑费用、厨房/农场产出均由 DATA 生成 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

// T1 职务指派·工坊当值标题：体力区间来自 DATA.RECIPES，不再写死「长枪」
g.workshopLv = 1;
UI.renderDuty();
const dh = elems['duty-page'].innerHTML;
const minS = Math.min(...DATA.RECIPES.map(r=>r.stamina));
const maxS = Math.max(...DATA.RECIPES.map(r=>r.stamina));
assert(dh.includes(`工坊当值（打造消耗当值者体力：${minS}⚡ ~ ${maxS}⚡`), 'T1a 工坊当值体力区间由配方生成');
assert(!dh.includes('长枪'), 'T1b 不再写死具体装备名');

// T2 百科·建筑表：费用直接取 DATA + upCost，与实际建造/升级一致
UI.wikiTab = 'play'; UI.openWiki();
const wh = elems['wiki-content'].innerHTML;
const up = d => [1,2,3,4].map(l=>Game.upCost(d,l)).join('/');
assert(wh.includes(`建造 ${DATA.KITCHEN.buildCost}｜升级 ${up(DATA.KITCHEN)}`), 'T2a 厨房费用与 DATA 一致');
assert(wh.includes(`建造 ${DATA.WORKSHOP.buildCost}｜升级 ${up(DATA.WORKSHOP)}`), 'T2b 工坊费用与 DATA 一致');
assert(wh.includes(`建造 ${DATA.HOSPITAL.buildCost}｜升级 ${up(DATA.HOSPITAL)}`), 'T2c 医院费用与 DATA 一致');
assert(!wh.includes('200 建造') && !wh.includes('每 200 升级'), 'T2d 移除旧版静态费用');

// T3 产出区间同样由 DATA 计算
assert(wh.includes([1,2,3,4,5].map(l=>DATA.KITCHEN.out(l)).join('/')), 'T3a 厨房产出 4/8/12/16/20');
assert(wh.includes([1,2,3,4,5].map(l=>DATA.FARM.out(l)).join('/')), 'T3b 农场产出 2/4/6/8/10');

// T4 建筑卡描述同步
UI.campSel = 'kitchen'; UI.renderBuild();
assert(elems['build-page'].innerHTML.includes('4/8/12/16/20'), 'T4a 厨房卡产出区间动态');
UI.campSel = 'farm'; UI.renderBuild();
assert(elems['build-page'].innerHTML.includes('2/4/6/8/10'), 'T4b 农场卡产出区间动态');

console.log('--- done ---');
process.exit(0);
