/* V142 招募入口升级为「广播站」：招募只是其中一项功能，其余功能占位待开放 */
const { setup, assert } = require('./_helper.js');
const { Game, UI, Recruit, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;

// T1 页面骨架：标题为广播站，招募作为子模块
assert(html.includes('<h2>广播站</h2>'), 'T1a 顶部标题为广播站');
assert(!html.includes('招募广播'), 'T1b 不再出现「招募广播」');
assert(html.includes('<h3>📻 广播站</h3>') && html.includes('<h3>👥 幸存者招募</h3>'), 'T1c 广播站 + 招募分区');
assert(html.includes('<h3>🔒 更多功能</h3>'), 'T1d 预留更多功能区');

// T2 占位功能标注即将开放
['求援信号','物资广播','远程情报'].forEach(n=>assert(html.includes(n), `T2 占位功能 ${n}`));
assert((html.match(/即将开放/g)||[]).length===3, 'T2b 三个占位功能均标即将开放');

// T3 营地入口改为广播站
UI.campSel = null; UI.renderBuild();
const bp = elems['build-page'].innerHTML;
assert(bp.includes('📻') && bp.includes('广播站'), 'T3a 营地格显示广播站');
assert(!bp.includes('>招募<'), 'T3b 营地格不再写「招募」');

// T4 招募功能本身不受影响
UI.openRecruit();
const rl = elems['recruit-list'].innerHTML;
assert((rl.match(/class="char-card recruit-card"/g)||[]).length===3, 'T4a 仍生成 3 名候选者');
assert(rl.includes('Recruit.hire(0)'), 'T4b 招募按钮可用');
assert(html.includes('幸存者招募</h3>'), 'T4c 招募列表位于招募分区');

// T5 引导文案同步
assert(html.includes('去广播站招募一位厨师') && html.includes('通过广播站寻找新的幸存者'), 'T5 空缺/团灭引导指向广播站');

console.log('--- done ---');
process.exit(0);
