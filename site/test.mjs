import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { pages } from './content.mjs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)),'dist');
const read = (p) => readFile(path.join(root,p),'utf8');
const info = JSON.parse(await read('build-info.json'));
const base = new URL(info.siteUrl);
const sitemap = await read('sitemap.xml');
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]);
assert.equal(locations.length,7);
assert.equal(new Set(locations).size,7);
const titles = new Set();
for (const lang of Object.keys(pages)) {
  for (const suffix of ['',pages[lang].guideSlug+'/']) {
    const route = lang+'/'+suffix;
    const html = await read(route+'index.html');
    assert(html.includes(`<html lang="${lang}" dir="${pages[lang].dir}">`));
    if (!suffix) {
      const counter = html.split('id="counter"')[1].split('</section>')[0];
      assert(counter.includes('referrer=utm_source%3Dweb_counter'));
      assert(counter.includes(pages[lang].appBenefits));
    }
    const canonical = new URL(route,base).href;
    assert(html.includes(`<link rel="canonical" href="${canonical}">`));
    assert(locations.includes(canonical));
    assert.equal((html.match(/<h1>/g)||[]).length,1);
    const title = html.match(/<title>(.*?)<\/title>/)[1];
    assert(!titles.has(title)); titles.add(title);
    assert(html.includes(`content="${info.production?'index,follow':'noindex,follow'}"`));
    for (const [other,p] of Object.entries(pages)) {
      const alternate = new URL(`${other}/${suffix?p.guideSlug+'/':''}`,base).href;
      assert(html.includes(`hreflang="${other}" href="${alternate}"`));
    }
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
    assert(schema['@graph'].some(node=>node['@type']==='WebPage'&&node.url===canonical));
    assert(!html.includes('aggregateRating'), 'Never invent ratings for rich results');
    for (const match of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
      const link = new URL(match[1].replaceAll('&amp;','&'),canonical);
      if (link.origin !== base.origin) continue;
      assert(link.pathname.startsWith(base.pathname));
      let relative = link.pathname.slice(base.pathname.length);
      if (!path.extname(relative)) relative += relative.endsWith('/')?'index.html':'/index.html';
      await readFile(path.join(root,relative));
    }
  }
}
assert((await read('robots.txt')).includes(info.production?'Allow: /':'Disallow: /'));
assert((await read('404.html')).includes('noindex'));
assert((await read('app-ads.txt')).includes('pub-1380972808968213'));

// Exercise the shipped counter script with a small DOM/storage boundary.
const script = await read('assets/counter.js');
function harness(raw=null,failWrite=false) {
  const handlers={}; let saved=raw, writes=0;
  const nodes = Object.fromEntries(['counter','count','tap','undo','reset','dhikr','target','feedback'].map(id=>[id,{textContent:'',value:'0',disabled:false,dataset:{locale:'en',confirm:'Reset?',complete:'Done',storageError:'Storage unavailable',storageConflict:'Changed in another tab'},options:[{text:'Subhanallah'},{text:'Alhamdulillah'},{text:'Allahu Akbar'}],events:{},setAttribute(){},addEventListener(type,fn){this.events[type]=fn;}}]));
  vm.runInNewContext(script,{Intl,Number,JSON,Math,Error,document:{getElementById:id=>nodes[id]},localStorage:{getItem:()=>raw,setItem:(_k,v)=>{if(failWrite)throw Error('quota');saved=v;writes++;}},window:{confirm:()=>true,addEventListener:(type,fn)=>{handlers[type]=fn;}}});
  return {nodes,handlers,saved:()=>saved,writes:()=>writes};
}
const h=harness();
for(let i=0;i<1000;i++)h.nodes.tap.events.click();
assert.equal(h.nodes.count.textContent,'1000');
h.nodes.undo.events.click(); assert.equal(h.nodes.count.textContent,'999');
h.nodes.dhikr.value='1';h.nodes.dhikr.events.change();h.nodes.tap.events.click();
h.nodes.reset.events.click();assert.equal(h.nodes.count.textContent,'0');
assert.equal(JSON.parse(h.saved()).counts[0],999);
const reload=harness(h.saved()); assert.equal(reload.nodes.count.textContent,'0');
reload.nodes.dhikr.value='0';reload.nodes.dhikr.events.change();assert.equal(reload.nodes.count.textContent,'999');
const corrupt=harness('{bad');corrupt.nodes.tap.events.click();assert.equal(corrupt.writes(),0);assert.equal(corrupt.nodes.feedback.textContent,'Storage unavailable');
const full=harness(null,true);full.nodes.tap.events.click();assert.equal(full.nodes.count.textContent,'1');assert.equal(full.nodes.feedback.textContent,'Storage unavailable');
h.handlers.storage({key:'zikirmatik-web:v1'});assert.equal(h.nodes.tap.disabled,true);
console.log('PASS: 7 routes; canonicals, reciprocal languages, sitemap, links, JSON-LD, robots, 404 and counter persistence/error/undo/cross-tab checks.');
