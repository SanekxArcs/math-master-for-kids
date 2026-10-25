import fs from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
try {
  const { PetArt } = await server.ssrLoadModule('/src/pets/PetArt.tsx');
  const css = await fs.readFile('src/pets/pet-art.css', 'utf8') + '\n' + await fs.readFile('src/pets/horse-art.css', 'utf8');
  let sequence = 0;
  const art = (props = {}, size = 224) => `<div class="drawing" style="--size:${size}px">${renderToStaticMarkup(createElement(PetArt, { species: 'horse', animated: true, ...props }), { identifierPrefix: `preview-${sequence++}-` })}</div>`;
  const moods = [['ok','Спокійний'],['happy','Радісний'],['hungry','Голодний'],['dirty','Брудний'],['sad','Сумний'],['sick','Хворий'],['vacation','На канікулах'],['asleep','Спить'],['gone','Спогад']];
  const card = (title, props) => `<article><h2>${title}</h2>${art(props)}</article>`;
  const html = `<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Коник — перевірка малюнка</title><style>
    ${css}
    *{box-sizing:border-box}body{margin:0;padding:28px;background:#f7f4ef;color:#46372e;font:15px system-ui,sans-serif}h1{font-size:28px;margin:0 0 8px}h2{font-size:14px;margin:0;color:#786452}label{display:inline-flex;align-items:center;gap:8px;margin:12px 0 24px}input{width:18px;height:18px;accent-color:#7c5abb}main{max-width:1100px;margin:auto}.hero{display:flex;justify-content:center;gap:40px;padding:22px;background:#fffaf2;border:1px solid #e9dfd1;border-radius:28px;margin:0 0 24px}.drawing{width:var(--size);height:var(--size);max-width:100%;margin:auto}.drawing svg{width:100%;height:100%}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}article{min-width:0;padding:18px 12px;border:1px solid #e7dfd4;border-radius:22px;background:white;text-align:center}article:nth-child(even){background:#f0edf8}.small{display:flex;align-items:center;justify-content:center;gap:25px;padding:22px;background:#262132;border-radius:24px;margin:24px 0}.small .drawing{margin:0}.heading{margin:28px 0 14px;font-size:20px}#freeze:checked~main .pet,#freeze:checked~main .pet *{animation:none!important}#freeze:checked~main .pet-z{opacity:1}.hero .drawing{margin:0}@media(max-width:700px){.grid{grid-template-columns:repeat(2,1fr)}.hero{gap:0}.hero .drawing{width:50%}body{padding:14px}}
  </style><h1>Коник: форма, міміка й рух</h1><input type="checkbox" id="freeze"><label for="freeze">Зупинити анімації для огляду</label><main>
    <div class="hero">${art({mood:'ok'},360)}${art({mood:'happy'},360)}</div>
    <div class="small">${[32,48,72,112].map(size=>art({mood:'happy',animated:false},size)).join('')}</div>
    <h2 class="heading">Настрої</h2><div class="grid">${moods.map(([mood,title])=>card(title,{mood,mud:mood==='dirty'?4:0})).join('')}</div>
    <h2 class="heading">Дії</h2><div class="grid">${[['eat','Їсть'],['wash','Купається'],['cheer','Радіє']].map(([action,title])=>card(title,{mood:'happy',action})).join('')}</div>
    <h2 class="heading">Гардероб</h2><div class="grid">${[
      ['Корона й сідло',{hat:'crown',back:'saddle',neck:'bandana'}],['Ковбой',{hat:'cowboyHat',neck:'bandana'}],['Чарівник',{hat:'wizardHat',back:'cape'}],['Квіти й окуляри',{hat:'flowerCrown',face:'sunglasses'}],['Крила',{back:'wings'}],['Меч',{back:'hunterSword'}]
    ].map(([title,worn])=>card(title,{worn})).join('')}</div>
  </main></html>`;
  await fs.mkdir('outputs/horse-art-review', { recursive: true });
  await fs.writeFile('outputs/horse-art-review/preview.html', html);
  console.log('Generated horse review gallery.');
} finally { await server.close(); }
