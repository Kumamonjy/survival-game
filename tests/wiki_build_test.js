/* V250 百科建筑介绍：建造/升级价与代码共用同一函数（d.buildCost 直读 + Game.upCost 动态调用），
   建筑介绍 = DATA.*.desc 数据直读（改配置百科自动同步）；上限 Lv.x 从 maxLv 直读；防御工事详情来自 DATA.TOWERS.desc */
const { setup, assert } = require('./_helper.js');
const { UI, DATA, elems, Game, html } = setup();

(async () => {
  // ===== T1 数据源：7 栋建筑 + 2 塔均有 desc =====
  ['KITCHEN','DORM','GYM','FARM','HOSPITAL','LAB','WORKSHOP'].forEach(k=>{
    assert(DATA[k] && typeof DATA[k].desc==='string' && DATA[k].desc.length>=15, `T1 ${k}.desc 配置存在`);
    assert(DATA[k].maxLv===5, `T1 ${k}.maxLv=5`);
  });
  assert(DATA.TOWERS.arrow.desc && DATA.TOWERS.ballista.desc, 'T1 塔配置含 desc');

  // ===== T2 百科渲染：价格列与数据/函数一致 =====
  UI.wikiTab='play'; UI.openWiki();
  const body = elems['wiki-content'].innerHTML;
  // 建造价直读
  assert(body.includes('建造 100｜') && body.includes('建造 130｜'), 'T2a 厨房 100 / 工坊 130 建造价直读');
  // 升级价 = Game.upCost 同函数（厨房 160 → ×1.5/×2/×2.5/×3）
  const kitchenUp = [1,2,3,4].map(l=>Game.upCost(DATA.KITCHEN,l)).join('/');
  assert(kitchenUp==='240/320/400/480' && body.includes(`升级 ${kitchenUp}`), `T2b 厨房升级价与 upCost 一致（${kitchenUp}）`);
  const wsUp = [1,2,3,4].map(l=>Game.upCost(DATA.WORKSHOP,l)).join('/');
  assert(body.includes(`升级 ${wsUp}`), `T2c 工坊升级价与 upCost 一致（${wsUp}）`);
  // 上限直读
  assert((body.match(/上限 Lv\.5/g)||[]).length>=7, 'T2d 7 栋建筑均标注上限 Lv.5');

  // ===== T3 建筑详情段 = desc 数据直读（改配置 → 百科同步） =====
  assert(body.includes('通常第一个建') && body.includes('寝室性价比极高'), 'T3a 厨房/寝室详情已展示');
  assert(body.includes(DATA.WORKSHOP.desc.slice(0,20)), 'T3b 工坊详情=WORKSHOP.desc');
  const probe = '【探针'+Date.now()+'】';
  DATA.KITCHEN.desc += probe;
  UI.openWiki();
  assert(elems['wiki-content'].innerHTML.includes(probe), 'T3c 改 DATA.KITCHEN.desc 后百科即时同步（数据驱动）');
  DATA.KITCHEN.desc = DATA.KITCHEN.desc.replace(probe,'');

  // ===== T4 防御工事：建造/升级/详情动态 =====
  assert(body.includes('建造 💰50🪵24⚙️10') || body.includes(Game.towerCostStr(DATA.TOWERS.arrow.buildCost)), 'T4a 箭塔建造价=towerCostStr');
  const twUp = [1,2,3,4].map(l=>Game.upCost({upgradeCost:DATA.TOWERS.arrow.upgradeCost}, l)).join('/');
  assert(body.includes(`升级 ${twUp}`), `T4b 箭塔升级价与 upCost 一致（${twUp}）`);
  assert(body.includes('固定自动射击') && body.includes(DATA.TOWERS.ballista.desc.slice(0,12)), 'T4c 塔详情=TOWERS.desc 直读');

  // ===== T5 旧断言不回归：表格结构与公式说明保留 =====
  assert(body.includes('基准价 ×(1+0.5×当前等级)'), 'T5 升级公式说明保留');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
