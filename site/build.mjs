import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pages } from './content.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'dist');
const production = process.argv.includes('--production');
const base = new URL(process.env.SITE_URL || 'http://localhost:4173/');
if (base.username || base.password || base.search || base.hash || (production && (base.protocol !== 'https:' || /localhost|example\.(com|org)/.test(base.hostname)))) {
  throw new Error('Set SITE_URL to the actual public HTTPS site URL before a production build.');
}
if (!base.pathname.endsWith('/')) base.pathname += '/';
const url = (p = '') => new URL(p, base).href;
const asset = (p) => `${base.pathname}assets/${p}`;
const escape = (v) => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const play = 'https://play.google.com/store/apps/details?id=com.zikirhane.tesbih';
const privacy = 'https://sites.google.com/view/hedefzikirmatik/ana-sayfa';
const languages = Object.keys(pages);
const route = (lang, guide) => `${lang}/${guide ? pages[lang].guideSlug + '/' : ''}`;
const tags = (guide) => languages.map(lang => `<link rel="alternate" hreflang="${lang}" href="${url(route(lang, guide))}">`).join('\n') +
  `\n<link rel="alternate" hreflang="x-default" href="${url(guide ? route('en', true) : '')}">`;
const verification = process.env.GOOGLE_SITE_VERIFICATION || '';

function shell(lang, body, guide = false, noindex = false) {
  const p = pages[lang];
  const canonical = url(route(lang, guide));
  const title = guide ? `${p.guideTitle} | Zikirmatik` : p.title;
  const description = guide ? p.guideIntro : p.description;
  const schema = {'@context':'https://schema.org','@graph':[
    {'@type':'WebSite','@id':url('#website'),url:url(),name:'Zikirmatik',inLanguage:languages},
    {'@type':'WebPage','@id':canonical,url:canonical,name:title,description,inLanguage:lang,isPartOf:{'@id':url('#website')}},
    ...(!guide ? [{'@type':'SoftwareApplication',name:'Zikirmatik: Dijital Tesbih',operatingSystem:'Android',applicationCategory:'LifestyleApplication',downloadUrl:play,url:canonical,offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},author:{'@type':'Organization',name:'BANGI'}}] : []),
  ]};
  return `<!doctype html>
<html lang="${lang}" dir="${p.dir}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title><meta name="description" content="${escape(description)}">
<meta name="robots" content="${production && !noindex ? 'index,follow' : 'noindex,follow'}">
<link rel="canonical" href="${canonical}">${tags(guide)}
${verification ? `<meta name="google-site-verification" content="${escape(verification)}">` : ''}
<meta property="og:type" content="website"><meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${url('assets/icon.png')}"><meta property="og:locale" content="${{tr:'tr_TR',en:'en_US',ar:'ar_AR'}[lang]}">
<meta name="twitter:card" content="summary"><meta name="theme-color" content="#091912">
<link rel="icon" href="${asset('favicon.png')}"><link rel="stylesheet" href="${asset('site.css')}">
<script type="application/ld+json">${json(schema)}</script><script defer src="${asset('counter.js')}"></script>
</head><body><a class="skip" href="#main">${p.skip}</a>
<header><a class="brand" href="${url(route(lang, false))}"><img src="${asset('icon.png')}" width="40" height="40" alt="">Zikirmatik</a><nav aria-label="${p.language}">${languages.map(l => `<a href="${url(route(l, guide))}" lang="${l}" hreflang="${l}"${l === lang ? ' aria-current="page"' : ''}>${pages[l].label}</a>`).join('')}</nav></header>
<main id="main">${body}</main>
<footer><p>${p.footer}</p><div><a href="${privacy}">${p.privacy}</a><a href="https://github.com/MrZekai/dijital-tesbih-app">${p.source}</a></div><p>${p.appNote}</p></footer></body></html>`;
}

await mkdir(path.join(out, 'assets'), {recursive:true});
for (const file of ['site.css', 'counter.js']) await copyFile(path.join(here, file), path.join(out, 'assets', file));
for (const file of ['icon.png', 'favicon.png']) await copyFile(path.join(here, '../frontend/assets/images', file), path.join(out, 'assets', file));
await copyFile(path.join(here, '../app-ads.txt'), path.join(out, 'app-ads.txt'));
const locations = [url()];
for (const lang of languages) {
  const p = pages[lang];
  const download = `${play}&hl=${lang}`;
  const body = `<section class="hero"><div class="intro"><p class="eyebrow">${p.eyebrow}</p><h1>${p.heading}</h1><p class="lead">${p.intro}</p><a class="cta" href="${download}">${p.cta}</a><a class="secondary" href="#counter">${p.try} ↓</a><p class="fine">${p.appNote}</p></div>
<section class="counter" id="counter" aria-labelledby="counter-heading" data-locale="${lang}" data-confirm="${escape(p.confirm)}" data-complete="${escape(p.complete)}" data-storage-error="${escape(p.storageError)}" data-storage-conflict="${escape(p.storageConflict)}">
<h2 id="counter-heading">${p.counter}</h2><label for="dhikr">${p.select}</label><select id="dhikr">${p.names.map((n,i)=>`<option value="${i}">${n}</option>`).join('')}</select>
<button id="tap" type="button" disabled><span id="count">0</span><span>${p.tap}</span></button>
<label for="target">${p.target}</label><select id="target"><option>33</option><option>99</option><option>100</option></select>
<div class="actions"><button id="undo" type="button" disabled>${p.undo}</button><button id="reset" type="button" disabled>${p.reset}</button></div>
<p id="feedback" role="status" aria-live="polite"></p><p class="fine">${p.local}</p><a class="cta" href="${play}&amp;referrer=utm_source%3Dweb_counter">${p.cta}</a><p>${p.appBenefits}</p><noscript><p>${p.nojs}</p></noscript></section></section>
<section class="section"><h2>${p.featuresTitle}</h2><div class="features">${p.features.map(([h,b])=>`<article><h3>${h}</h3><p>${b}</p></article>`).join('')}</div></section>
<section class="guide-link section"><div><h2>${p.guideTitle}</h2><p>${p.guideIntro}</p></div><a class="cta" href="${url(route(lang,true))}">${p.guideTitle} →</a></section>
<section class="section faq"><h2>${p.faqTitle}</h2>${p.faq.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</section>`;
  const guideBody = `<article class="reading"><a href="${url(route(lang,false))}">${p.back}</a><h1>${p.guideTitle}</h1><p class="lead">${p.guideIntro}</p>${p.guide.map(([h,b])=>`<section><h2>${h}</h2><p>${b}</p></section>`).join('')}<a class="cta" href="${download}">${p.cta}</a><p>${p.appNote}</p></article>`;
  for (const [isGuide, content] of [[false,body],[true,guideBody]]) {
    const target = path.join(out,route(lang,isGuide));
    await mkdir(target,{recursive:true});
    await writeFile(path.join(target,'index.html'),shell(lang,content,isGuide));
    locations.push(url(route(lang,isGuide)));
  }
}
const home = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zikirmatik · Dhikr Counter · عداد التسبيح</title><meta name="description" content="Choose your language to use Zikirmatik, the online dhikr counter, or discover the Android digital tasbih app."><meta name="robots" content="${production?'index,follow':'noindex,follow'}"><link rel="canonical" href="${url()}">${tags(false)}<link rel="stylesheet" href="${asset('site.css')}">${verification?`<meta name="google-site-verification" content="${escape(verification)}">`:''}</head><body><main class="language-picker"><img src="${asset('icon.png')}" width="80" height="80" alt=""><h1>Zikirmatik</h1><p>Türkçe · English · العربية</p><nav aria-label="Language">${languages.map(l=>`<a class="cta" href="${url(route(l,false))}" lang="${l}" hreflang="${l}">${pages[l].label}</a>`).join('')}</nav></main></body></html>`;
await writeFile(path.join(out,'index.html'),home);
await writeFile(path.join(out,'404.html'),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Page not found · Zikirmatik</title></head><body><h1>404</h1><p>Sayfa bulunamadı · Page not found · الصفحة غير موجودة</p><a href="${url()}">Zikirmatik</a></body></html>`);
await writeFile(path.join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locations.map(loc=>`<url><loc>${escape(loc)}</loc></url>`).join('')}</urlset>`);
await writeFile(path.join(out,'robots.txt'),`User-agent: *\n${production?'Allow: /':'Disallow: /'}\nSitemap: ${url('sitemap.xml')}\n`);
await writeFile(path.join(out,'.nojekyll'),'');
await writeFile(path.join(out,'build-info.json'),JSON.stringify({siteUrl:url(),production,pages:locations},null,2));
console.log(`Built ${locations.length} indexable routes for ${url()} (${production?'production':'preview: noindex'}).`);
