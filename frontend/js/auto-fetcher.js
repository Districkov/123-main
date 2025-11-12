async function fetchJSON(url){ try{ const r=await fetch(url); if(!r.ok) return []; return await r.json(); }catch(e){ console.error(e); return []; } }

// Render products into likely containers
async function renderProducts(){
  const products = await fetchJSON('/api/products');
  if(!products || !products.length) return;
  // find container
  let container = document.querySelector('.catalog__content, .catalog, #catalog, .products, .product-list, .catalog-list') || document.querySelector('.container');
  if(!container) container = document.body;
  const html = products.map(p=>`<div class="product-card"><h3>${p.title||''}</h3><p>${p.description||''}</p><div>${p.price?('Цена: '+p.price):''}</div></div>`).join('');
  // insert after existing hero or replace minimal area
  const target = container.querySelector ? container : container;
  const wrapper = document.createElement('div'); wrapper.className='injected-products'; wrapper.innerHTML = html;
  container.appendChild(wrapper);
}

// Render articles into blog page
async function renderArticles(){
  const articles = await fetchJSON('/api/articles');
  const container = document.querySelector('.blog__content');
  if(!container) return;
  container.innerHTML = '';
  // Featured & grid split: first becomes featured
  if(articles.length>0){
    const a = articles[0];
    const featured = document.createElement('article'); featured.className='blog__featured';
    featured.innerHTML = `
      <div class="featured__image"><img src="${a.image||'images/1.png'}" alt="${a.title||''}"></div>
      <div class="featured__content">
        <span class="article__category">${a.category||''}</span>
        <h2 class="article__title">${a.title||''}</h2>
        <p class="article__excerpt">${a.excerpt||''}</p>
        <div class="article__meta"><span class="article__date">${a.date||''}</span><span class="article__read-time">${a.readTime||''}</span></div>
        <button class="btn btn--primary read-article-btn" data-id="${a.id}">Читать статью</button>
      </div>`;
    container.appendChild(featured);
  }
  const grid = document.createElement('div'); grid.className='blog__grid';
  for(let i=1;i<articles.length;i++){
    const it = articles[i];
    const card = document.createElement('article'); card.className='blog__card';
    card.innerHTML = `
      <div class="blog-card__image"><img src="${it.image||''}" alt="${it.title||''}"></div>
      <div class="blog-card__content">
        <span class="article__category">${it.category||''}</span>
        <h3 class="blog-card__title">${it.title||''}</h3>
        <p class="blog-card__excerpt">${it.excerpt||''}</p>
        <div class="blog-card__meta"><span class="article__date">${it.date||''}</span><span class="article__read-time">${it.readTime||''}</span></div>
        <button class="blog-card__link read-article-btn" data-id="${it.id}">Читать →</button>
      </div>`;
    grid.appendChild(card);
  }
  container.appendChild(grid);

  // simple popup rendering
  const popupsHolder = document.createElement('div'); popupsHolder.id='injected-popups';
  for(const it of articles){
    const div = document.createElement('div'); div.className='article-popup'; div.id='article-popup-'+it.id;
    div.innerHTML = `
      <div class="article-popup__overlay"></div>
      <div class="article-popup__content">
        <button class="article-popup__close"><i class="fas fa-times"></i></button>
        <div class="article-popup__body">
          <div class="article-popup__header">
            <span class="article-popup__category">${it.category||''}</span>
            <h1 class="article-popup__title">${it.title||''}</h1>
            <div class="article-popup__meta"><span>${it.date||''}</span><span>${it.readTime||''}</span></div>
          </div>
          <div class="article-popup__image"><img src="${it.image||''}" alt=""></div>
          <div class="article-popup__content-text">${it.content||''}</div>
        </div>
      </div>`;
    popupsHolder.appendChild(div);
  }
  document.body.appendChild(popupsHolder);

  // attach event listeners for read buttons and close
  document.querySelectorAll('.read-article-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-id');
      const p = document.getElementById('article-popup-'+id);
      if(p){ p.classList.add('active'); document.body.style.overflow='hidden'; }
    });
  });
  document.addEventListener('click', (e)=>{
    if(e.target.matches('.article-popup__close') || e.target.matches('.article-popup__overlay')){
      document.querySelectorAll('.article-popup.active').forEach(p=>p.classList.remove('active'));
      document.body.style.overflow='';
    }
  });
}

// Auto init based on page
document.addEventListener('DOMContentLoaded', ()=>{
  const path = location.pathname.split('/').pop();
  if(path === 'catalog.html' || path === 'catalog' || path === 'catalog.php') renderProducts();
  if(path === 'blog.html' || path === 'blog') renderArticles();
  // also if index or others, nothing
});
