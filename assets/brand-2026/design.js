/* Decorative enhancement only: does not change copy, links, data or event handlers. */
(() => {
 'use strict';
 const assetRoot = new URL('.', document.currentScript.src);
 const icons={
  people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v3"/>',
  statistics:'<path d="M4 3v17h17M8 16v-4m5 4V7m5 9v-6M7 8l5-4 6 2"/>',
  data:'<ellipse cx="9" cy="5" rx="6" ry="3"/><path d="M3 5v11c0 4 12 4 12 0V5M3 10c0 4 12 4 12 0m2 0h3v7h-3m3 0v4h-8"/>',
  ai:'<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4M9 12l3-3 3 3-3 3z"/>',
  research:'<path d="M9 3h6m-5 0v7l-6 9a1.3 1.3 0 0 0 1 2h14a1.3 1.3 0 0 0 1-2l-6-9V3M7 16h10M11 13h2"/>',
  project:'<path d="M3 21V9l7-4v16m0-18h10v18M1 21h22M6 12v2m0 3v1m8-11h2m-2 4h2m-2 4h2"/>',
  growth:'<path d="M12 22V10M12 15C4 15 3 8 3 5c8 0 9 4 9 10Zm0-4c0-7 4-9 9-9 0 6-3 9-9 9Z"/>',
  survey:'<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M8 10l2 2 3-4m1 3h2M8 17l2 2 3-4m1 3h2"/>',
  contact:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'
 };
 const svg=(name)=>`<svg class="init-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[name]||icons.data}</svg>`;
 const page=document.body.dataset.page||'home';
 const pageIcon={home:'data',company:'people',services:'statistics',solutions:'ai',projects:'project',careers:'growth',contact:'contact'}[page]||'research';
 document.querySelectorAll('.eyebrow > i').forEach(el=>{el.classList.add('init-mark');el.setAttribute('aria-hidden','true');el.innerHTML=svg(pageIcon)});
 ['strategy','quality','analytics','system'].forEach((name,i)=>{
  const el=document.querySelector('.summary-card-visual--'+name);
  if(el) el.innerHTML=svg(['statistics','data','ai','survey'][i]);
 });
 ['consulting','quality','analytics','engineering'].forEach((name,i)=>{
  const el=document.querySelector('#'+name+' .corp-service-index');
  if(el&&!el.querySelector('.init-icon'))el.insertAdjacentHTML('beforeend',svg(['statistics','data','ai','project'][i]));
 });
 function editorialPhoto(selector,name){
  const el=document.querySelector(selector);if(!el||el.querySelector('.init-editorial-photo'))return;
  const figure=document.createElement('div');figure.className='init-editorial-photo';figure.setAttribute('aria-hidden','true');
  const img=document.createElement('img');img.src=new URL(name+'.webp',assetRoot).href;img.alt='';img.loading='lazy';img.decoding='async';img.width=1672;img.height=941;
  figure.append(img);el.append(figure);
 }
 editorialPhoto('.corp-team-copy','team');
 editorialPhoto('.corp-growth-layout .corp-heading','growth');
 const locationLabels=[];
 const companyHero=document.querySelector('.menu-family-hero--company');
 if(companyHero){
  const caption=document.createElement('p');caption.className='init-place-caption';
  companyHero.append(caption);
  locationLabels.push([caption,'design.location.headquarters']);
 }
 const contactCopy=document.querySelector('.corp-contact-hero .corp-hero-copy');
 if(contactCopy){
  const figure=document.createElement('figure');figure.className='init-location-photo';
  const img=document.createElement('img');img.src=new URL('gaon-rooftop.webp',assetRoot).href;img.width=1000;img.height=560;img.decoding='async';
  const caption=document.createElement('figcaption');figure.append(img,caption);contactCopy.append(figure);
  locationLabels.push([caption,'design.location.sharedSpaces']);
  locationLabels.push([img,'design.location.rooftopAlt','alt']);
 }
 function syncLocationLabels() {
  if (!window.INIT_I18N) return;
  locationLabels.forEach(([el,key,attr])=>{
   const text=window.INIT_I18N.t(key);
   if(attr)el.setAttribute(attr,text);else el.textContent=text;
  });
 }
 document.addEventListener('init:languagechange',syncLocationLabels);
 window.INIT_I18N?.ready.then(syncLocationLabels);
 document.documentElement.dataset.initDesign='2026.09';
})();
