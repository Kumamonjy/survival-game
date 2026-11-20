/* V131 百科「🧰 装备」页新增部位子标签（全部 + 武器/头盔/衣服/鞋子/饰品/道具） */
const { setup, assert } = require('./_helper.js');
const { Game, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;

const body = () => { UI.wikiTab = 'equip'; UI.openWiki(); return elems['wiki-content'].innerHTML; };

// T1 子标签齐全（全部 + DATA.SLOTS 六部位）
delete UI.wikiEquipSlot;
let h = body();
assert(h.includes('wiki-subtabs'), 'T1a 装备页渲染子标签容器');
assert(h.includes('📦 全部</button>'), 'T1b 子标签含「全部」');
DATA.SLOTS.forEach(s=>{
  assert(h.includes(`${s.icon} ${s.name}</button>`), `T1b 子标签含「${s.name}」`);
});
assert((h.match(/class="wiki-subtab( |")/g)||[]).length === 1 + DATA.SLOTS.length, 'T1c 子标签数量 = 1 + 部位数');
assert(h.includes('装备图鉴（') && h.includes('件'), 'T1d 标题显示数量');

// T2 默认「全部」：所有装备都列出
Object.values(DATA.EQUIPS).forEach(e=>{
  assert(h.includes(e.name), `T2 默认全部含「${e.name}」`);
});

// T3 衣服：只显示 armor 部位
UI.wikiEquipSlot = 'armor';
h = body();
const armors = Object.values(DATA.EQUIPS).filter(e=>e.slot==='armor');
assert(armors.every(e=>h.includes(e.name)), 'T3a 衣服子标签含全部衣服');
assert(!h.includes('木棍') && !h.includes('布鞋') && !h.includes('保温杯'), 'T3b 衣服子标签不含其他部位');
assert(h.includes('· 衣服）'), 'T3c 标题标注当前部位');
assert(/class="wiki-subtab active"[^>]*>👕 衣服/.test(h), 'T3d 衣服标签高亮');

// T4 武器：只显示 weapon 部位
UI.wikiEquipSlot = 'weapon';
h = body();
const weapons = Object.values(DATA.EQUIPS).filter(e=>e.slot==='weapon');
assert(weapons.every(e=>h.includes(e.name)), 'T4a 武器子标签含全部武器');
assert(!h.includes('布衣') && !h.includes('燃烧瓶'), 'T4b 武器子标签不含衣服/道具');

// T5 道具：消耗品含燃烧瓶
UI.wikiEquipSlot = 'item';
h = body();
assert(h.includes('燃烧瓶') && h.includes('绷带') && h.includes('解毒针'), 'T5a 道具子标签含消耗品');
assert(h.includes('消耗品'), 'T5b 道具行标注消耗品');
assert(!h.includes('木弓'), 'T5c 道具子标签不含武器');

// T6 数据驱动：新增一个未出现过的部位后自动生成子标签
DATA.SLOTS.push({ id:'__t__', name:'测试部', icon:'🧪' });
UI.wikiEquipSlot = '__t__';
h = body();
assert(h.includes('测试部') && h.includes('该部位暂无装备'), 'T6 新增部位自动出现并显示空态');
DATA.SLOTS.pop();
delete UI.wikiEquipSlot;

console.log('--- done ---');
process.exit(0);
