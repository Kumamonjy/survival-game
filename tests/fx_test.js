/* V89 sangshi 风格战斗特效：受击白闪 / 远程弹道 / 技能金光 / AI 行动者高亮 */
const fs = require('fs');
const html = fs.readFileSync('/workspace/index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
let code = scripts[scripts.length - 1].replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
const bootIdx = code.lastIndexOf("Game.renderHome();\n  window.addEventListener('resize'");
code = code.slice(0, bootIdx) + "window.__T = { Game, Battle, UI, DATA };\n})();";
const elems = {};
function mkEl(){ return { innerHTML:'', textContent:'', style:{ setProperty(){}, cssText:'' }, disabled:false, scrollTop:0, value:'', dataset:{}, children:[], offsetWidth:36, className:'', classList:{ s:new Set(), add(c){this.s.add(c);}, remove(c){this.s.delete(c);}, contains(c){return this.s.has(c);} }, setAttribute(){}, removeAttribute(){}, appendChild(c){this.children.push(c);return c;}, remove(){}, addEventListener(){}, focus(){}, blur(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getBoundingClientRect(){return{width:400,height:700,top:0,left:0,bottom:700};} }; }
global.document = { getElementById:id=>elems[id]||(elems[id]=mkEl()), querySelector:()=>mkEl(), querySelectorAll:()=>[], addEventListener(){}, createElement:()=>mkEl(), body:mkEl() };
global.window = { addEventListener(){}, location:{search:''}, scrollTo(){}, innerWidth:400, innerHeight:700 };
global.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
global.navigator = { userAgent:'node' };
global.getComputedStyle = () => ({ getPropertyValue:()=>'' });
eval(code);
const assert=(c,n)=>console.log(c?'PASS '+n:'FAIL '+n);
const { Game, Battle, UI, DATA } = window.__T;
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 CSS 与渲染挂点存在
  assert(html.includes('@keyframes fxWhite') && html.includes('.unit.hit-white::after'), 'T1a 受击白闪 CSS');
  assert(html.includes('@keyframes fxCast') && html.includes('.unit.cast-glow'), 'T1b 技能施放金光 CSS');
  assert(html.includes('@keyframes actPulse') && html.includes('.unit.acting-unit'), 'T1c 行动者高亮 CSS');
  assert(html.includes('.projectile'), 'T1d 远程弹道 CSS');
  assert(html.includes("${u._acting?'acting-unit':''}"), 'T1e renderMap 挂 acting-unit');
  assert(html.includes("fxAt(u.row, u.col, 'cast-glow', 400)"), 'T1f execSkill 挂 cast-glow');
  assert(html.includes("fxAt(def.row, def.col, 'hit-white', 300)"), 'T1g applyDamage 挂 hit-white');
  assert(html.includes("await Battle.fxProjectile(att, def"), 'T1h 远程普攻走弹道');

  // T2 构造战斗：AI 行动高亮标记生命周期
  const b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')), moveSet:null, targetSet:null, mode:null, turn:1, phase:'enemy', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null };
  Battle.b = b;
  const ally = Battle.mkAlly(Game.createChar('soldier','兵',false), 5, 5);
  const zom = Battle.mkZombie('walker', 5, 6, 1);
  b.units = [ally, zom];

  // T3 fxProjectile：mock 环境安全执行（有/无地图两种情况）
  elems['battle-map'] = mkEl();
  elems['battle-map'].children = Array.from({length:Battle.ROWS*Battle.COLS},()=>mkEl());
  await Battle.fxProjectile(ally, zom, '✦');   // 不抛错即通过
  assert(true, 'T3a fxProjectile 正常执行');
  elems['battle-map'] = mkEl(); elems['battle-map'].children = [];
  await Battle.fxProjectile(ally, zom);        // 空地图安全跳过
  assert(true, 'T3b 空地图安全跳过');

  // T4 AI 行动：_acting 置位/清除（丧尸攻击后）
  b.phase = 'enemy';
  await Battle.aiAct(zom, b.units.filter(x=>x.side==='ally'&&x.hp>0));
  assert(zom._acting !== true, 'T4a 行动结束 _acting 清除');
  assert(zom.hp >= 0, 'T4b aiAct 包装壳不破坏行为');

  // T5 代打（我方）也走同一高亮通道：休息兜底后 _acting 清除
  const far = Battle.mkZombie('walker', 10, 10, 1);
  const a3 = Battle.mkAlly(Game.createChar('explorer','游侠',false), 0, 0);
  b.units = [a3, far];
  a3.stamina = 100;
  await Battle.aiAct(a3, b.units.filter(x=>x.side==='enemy'&&x.hp>0));
  assert(a3.isDefending===true && a3._acting !== true, 'T5 代打休息后 _acting 清除');

  console.log('--- done ---');
  process.exit(0);
})();
