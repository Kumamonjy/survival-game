/* V127 百科「🗺️ 地图」页：7 张地图的门槛/产出/敌情/地形，且全部由 DATA.ZONES 驱动 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;

UI.wikiTab = 'map'; UI.openWiki();
const body = elems['wiki-content'].innerHTML;

// T1 分页标签
assert(body.includes("UI.wikiTab='map'") && body.includes('🗺️ 地图'), 'T1 百科新增地图分页标签');
assert(body.includes('🗺️ 探险地图（8 张）'), 'T2 地图页标题显示总数');

// T3 七个区域全部列出（含新图）
assert(DATA.ZONES.every(z=>body.includes(z.name)) && body.includes('废弃加油站') && body.includes('林场'),
  'T3 七个区域（含加油站/林场）全部列出');

// T4 产出：危险度星数、主/次产出区间
assert(body.includes('★★★★') && body.includes('💰 12-20') && body.includes('🪵 6-10'),
  'T4a 军事基地 4★ / 加油站金币（12-20）/ 林场木材产出区间');
assert(!body.includes('解锁'), 'T4b 地图页不再显示解锁天数');

// T5 敌情：概率构成 + Boss 标注
assert(body.includes('🧭 敌情与地形') && body.includes('Boss：暴君变异体'), 'T5a 敌情表标注基地 Boss');
assert(body.includes('长舌丧尸') && body.includes('自爆丧尸') && body.includes('暴君变异体'), 'T5b 敌情表列出丧尸名称');
assert(DATA.ZONES.every(z=>body.includes(`${z.count[0]}-${z.count[1]} 只`)), 'T5c 每区域显示丧尸数量区间');

// T6 地形配方
assert(body.includes('🛢️</span>24') && body.includes('🌊6'), 'T6 地形配方（加油站油桶红化/医院积水减半）');

// T6b 装备掉落列（表格内呈现概率与类型；底部探险规则不再重复）
assert(body.includes('<th>装备掉落</th>') && body.includes('15% · 仅武器') && body.includes('100%</b> 必掉一件') && body.includes('20% · 全类型'), 'T6b 探险地图表含装备掉落列');
assert(!body.includes('装备掉落分层'), 'T6c 探险规则不再重复掉落介绍');

// T7 规则说明
['6 人', '15⚡', '精品物资箱', '不消耗天数', '出战平均等级'].forEach(k=>{
  assert(body.includes(k), `T7 规则含「${k}」`);
});

// T8 数据驱动：临时加一张图后自动出现在百科，无需改渲染代码
DATA.ZONES.push({ id:'__tmp__', name:'临时测试区', icon:'🧪', danger:5,
  desc:'测试用', main:{gold:[1,2]}, sub:{food:[1,1]}, count:[1,2], pool:{walker:100}, boss:false,
  terrain:{ water:1 } });
UI.openWiki();
const body2 = elems['wiki-content'].innerHTML;
assert(body2.includes('临时测试区') && body2.includes('（9 张）'), 'T8 新增地图自动出现在百科');
DATA.ZONES.pop();

// T9 敌人页不再重复罗列地图解锁（改为指向地图页）
UI.wikiTab='enemy'; UI.openWiki();
const enemyBody = elems['wiki-content'].innerHTML;
assert(enemyBody.includes('各区域的敌人构成、数量与 Boss 见「🗺️ 地图」页') && !enemyBody.includes('1★ 第 1 天'),
  'T9 敌人页去重并指向地图页');

console.log('--- done ---');
process.exit(0);
