/* V140 文案与数据一致性：工坊体力区间、百科建筑费用、厨房/农场产出均由 DATA 生成 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

// T1 职务指派·工坊当值标题：体力区间来自 DATA.RECIPES，不再写死「长矛」
g.workshopLv = 1;
UI.renderDuty();
const dh = elems['duty-page'].innerHTML;
const minS = Math.min(...DATA.RECIPES.map(r=>r.stamina));
const maxS = Math.max(...DATA.RECIPES.map(r=>r.stamina));
assert(dh.includes(`工坊当值（打造消耗当值者体力：${minS}⚡ ~ ${maxS}⚡`), 'T1a 工坊当值体力区间由配方生成');
assert(!dh.includes('长矛'), 'T1b 不再写死具体装备名');

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

// T5 天赋数量描述与实际概率一致
UI.wikiTab = 'talent'; UI.openWiki();
const th = elems['wiki-content'].innerHTML;
assert(th.includes('1 个 60% / 2 个 30% / 3 个 10%') && !th.includes('等概率'), 'T5a 天赋数量写成实际概率');
assert(th.includes('生命/攻击/防御/体力类天赋作用于基础值') && th.includes('射程/移速/暴击类为固定加成'), 'T5b 天赋成长范围准确');

// T6 长矛命名 & 职业移速描述
UI.wikiTab = 'equip'; UI.openWiki();
const eh = elems['wiki-content'].innerHTML;
assert(DATA.EQUIPS.spear.name==='长矛', 'T6a 长枪已改名长矛');
assert(eh.includes('长矛') && !eh.includes('长枪'), 'T6b 百科同步新名称');
assert(!DATA.CLASSES.thief.desc.includes('全场最快') && !DATA.CLASSES.scout.desc.includes('全场最快'), 'T6c 不再宣称唯一最快');

// T7 生产配方由 DATA 生成（绷带实为 2🧵）
assert(eh.includes('医院生产：10⚡<br>2🧵<br>1💊'), 'T7a 绷带配方与 DATA 一致（逐资源一行）');
assert(eh.includes('实验室生产：15⚡<br>1⚙️<br>3💊<br>15💰'), 'T7b 解毒针配方与 DATA 一致（逐资源一行）');

// T8 资源用途与获取途径
assert(html.includes('工坊打造/装备升级'), 'T8a 金属用途补充工坊');
assert(eh.includes('精品物资箱 10%'), 'T8b 特殊饰品来源标注精品物资箱');
assert(DATA.WORKSHOP.desc.includes('消耗品'), 'T8c 工坊说明含消耗品');

console.log('--- done ---');
process.exit(0);
