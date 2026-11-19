/* 测试公共 helper：统一 mock 环境 + 加载 index.html 主脚本
 * 用法：
 *   const { setup, assert } = require('./_helper.js');
 *   const { Game, Battle, UI, DATA, elems, html } = setup();
 *   Game.g = Game.newGame(); Game.currentSlot = 1; const g = Game.g;
 */
const fs = require('fs');
function setup() {
  const html = fs.readFileSync('/workspace/index.html', 'utf8');
  const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
  let code = scripts[scripts.length - 1].replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
  const bootIdx = code.lastIndexOf("Game.renderHome();\n  window.addEventListener('resize'");
  code = code.slice(0, bootIdx) + "window.__T = { Game, Battle, UI, Recruit, DATA };\n})();";
  const elems = {};
  const store = {};   // localStorage 后备存储（存档类测试用）
  function mkEl() {
    return { innerHTML:'', textContent:'', style:{ setProperty(){}, cssText:'' }, disabled:false,
      scrollTop:0, scrollLeft:0, offsetWidth:36, offsetHeight:36, offsetLeft:0, offsetTop:0, value:'', dataset:{}, children:[], className:'',
      classList:{ s:new Set(), add(c){this.s.add(c);}, remove(c){this.s.delete(c);}, contains(c){return this.s.has(c);}, toggle(){} },
      setAttribute(){}, removeAttribute(){}, appendChild(c){this.children.push(c);return c;}, remove(){},
      addEventListener(){}, focus(){}, blur(){},
      querySelector(){return null;}, querySelectorAll(){return [];},
      getBoundingClientRect(){return{width:400,height:700,top:0,left:0,bottom:700};} };
  }
  global.document = { getElementById:id=>elems[id]||(elems[id]=mkEl()), querySelector:()=>mkEl(), querySelectorAll:()=>[], addEventListener(){}, createElement:()=>mkEl(), body:mkEl() };
  global.window = { addEventListener(){}, location:{search:''}, scrollTo(){}, innerWidth:400, innerHeight:700 };
  global.localStorage = { getItem:k=>store[k]||null, setItem:(k,v)=>{store[k]=v;}, removeItem:k=>{delete store[k];} };
  global.navigator = { userAgent:'node' };
  global.getComputedStyle = () => ({ getPropertyValue:()=>'' });
  eval(code);
  return Object.assign({}, window.__T, { elems, store, html, mkEl });
}
function assert(c, n) { console.log(c ? 'PASS ' + n : 'FAIL ' + n); }
module.exports = { setup, assert };
