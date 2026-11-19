/* V117 家园访客：流动商人（回收/出售各一笔，价格围绕基准价浮动）+ 流浪者（150金+20食物招募）+ 每日过夜刷新、无付费重刷 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 新档即有访客：双报价 + 流浪者 + day 匹配
  const v = g.visitors;
  assert(v && v.day === g.day, 'T1a 新档生成当日访客');
  assert(v.merchant && v.merchant.buy && v.merchant.sell && v.wanderer, 'T1b 商人双报价 + 流浪者齐备');
  assert(v.merchant.buy.res !== v.merchant.sell.res, 'T1c 回收与出售是不同物资');

  // T2 报价合理性：资源在池内、数量在区间、价格按统一单价（回收 2.5💰/份、出售 3💰/份）
  const V = DATA.VISITOR;
  const inPool = r => Object.keys(V.amt).includes(r);
  const inAmt = o => { const [a,b] = V.amt[o.res]; return o.amt>=a && o.amt<=b; };
  assert(inPool(v.merchant.buy.res) && inPool(v.merchant.sell.res), 'T2a 报价资源在池内');
  assert(inAmt(v.merchant.buy) && inAmt(v.merchant.sell), 'T2b 数量在区间内');
  assert(v.merchant.buy.gold === Math.round(v.merchant.buy.amt*V.buyPrice), 'T2c 回收价 = 数量×2.5');
  assert(v.merchant.sell.gold === v.merchant.sell.amt*V.sellPrice, 'T2d 出售价 = 数量×3');

  // T3 回收成交：扣资源加金币 + done + 二次拦截
  const b0 = v.merchant.buy;
  g.res[b0.res] = b0.amt; g.res.gold = 100;
  const gold0 = g.res.gold, res0 = g.res[b0.res];
  Game.tradeMerchant('buy');
  assert(g.res.gold === gold0 + b0.gold && g.res[b0.res] === res0 - b0.amt, 'T3a 回收成交：资源变金币');
  assert(b0.done === true, 'T3b 报价标记已成交');
  const g1 = g.res.gold;
  Game.tradeMerchant('buy');
  assert(g.res.gold === g1, 'T3c 同一报价二次成交被拦截');

  // T4 出售成交：扣金币加资源 + done + 二次拦截
  const s0 = v.merchant.sell;
  g.res.gold = s0.gold + 50;
  const gold1 = g.res.gold, res1 = g.res[s0.res]||0;
  Game.tradeMerchant('sell');
  assert(g.res.gold === gold1 - s0.gold && (g.res[s0.res]||0) === res1 + s0.amt, 'T4a 出售成交：金币变资源');
  assert(s0.done === true, 'T4b 已成交');
  Game.tradeMerchant('sell');
  assert((g.res[s0.res]||0) === res1 + s0.amt, 'T4c 二次拦截');

  // T5 流浪者：职业天赋预生成 + 招募入队扣费
  const w = v.wanderer;
  assert(DATA.CLASSES[w.cls] && Array.isArray(w.talents), 'T5a 流浪者职业/天赋已预生成');
  const alive0 = g.chars.filter(c=>!c.dead).length;
  g.res.gold = 500; g.res.food = 100;
  Game.recruitWanderer();
  assert(w.recruited === true, 'T5b 招募标记');
  assert(g.chars.filter(c=>!c.dead).length === alive0+1 && g.chars.includes(w), 'T5c 流浪者入队');
  assert(g.res.gold === 500-150 && g.res.food === 100-20, 'T5d 扣 150金+20食物');
  Game.recruitWanderer();
  assert(g.chars.filter(c=>!c.dead).length === alive0+1, 'T5e 二次招募拦截');

  // T6 拦截：资源不足
  g.res.gold = 10; g.res.food = 10;
  w.recruited = false;
  const cnt0 = g.chars.length;
  Game.recruitWanderer();
  assert(g.chars.length === cnt0 && w.recruited === false, 'T6 资源不足招募被拦截');

  // T7 每日刷新：过夜生成新访客（day 更新、done 重置）；无任何付费刷新入口
  g.res.gold = 500; g.res.food = 100;
  const oldDay = g.visitors.day;
  Game.nextDay();
  assert(g.visitors.day === g.day && g.day === oldDay+1, 'T7a 过夜刷新访客 day');
  assert(g.visitors.merchant.buy.done === false && g.visitors.merchant.sell.done === false, 'T7b 新的一天报价重置');
  assert(!/onclick="Game\.rollVisitors/.test(html) && !/rollVisitors\(\)"/.test(html), 'T7c 无按钮入口触发 rollVisitors（不可付费重刷）');
  assert(html.includes('无法付费重刷'), 'T7d UI 明确标注无法付费重刷');

  // T8 旧档迁移：无访客旧档 applySave 补生成当日访客
  delete g.visitors;
  Game.applySave({ state: g, uid: 1000 }, 1);
  assert(g.visitors && g.visitors.day === g.day, 'T8 旧档迁移补访客');

  // T9 主界面入口与弹窗渲染
  assert(html.includes('onclick="UI.openVisitors()"') && html.includes('badge-visitor'), 'T9a 主界面家园访客按钮 + 待处理徽标');
  UI.openVisitors();
  const mh = Object.values(elems).map(e=>e.innerHTML).join('');
  assert(mh.includes('流动商人') && mh.includes('流浪者'), 'T9b 弹窗含双访客面板');
  assert(mh.includes('卖给商人') && mh.includes('买下'), 'T9c 商人回收/出售报价渲染正常');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
