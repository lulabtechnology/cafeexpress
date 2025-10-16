/* ============================================================================
   Tienda mínima — listado + detalle (product.html) + WhatsApp + mejoras UX
   ========================================================================== */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

async function boot() {
  const page = isProductDetailPage() ? 'detail' : 'list';
  try {
    applyBranding();

    if (page === 'list') {
      skeletonCards(6);
      const products = await loadProducts();
      if (!Array.isArray(products) || !products.length) {
        showAlert('warning', 'No hay productos para mostrar.');
        return setEmptyState('No hay productos disponibles.');
      }
      populateTagFilter(products);
      renderProducts(products);
      wireListUI(products);
    } else {
      const products = await loadProducts();
      const id = getQuery('id');
      if (!id) {
        showAlert('error','Falta el parámetro ?id en la URL.');
        return;
      }
      const product = products.find(p => p.id === id);
      if (!product) {
        showAlert('error','No se encontró el producto solicitado.');
        return;
      }
      renderProductDetail(product);
    }
  } catch (err) {
    console.error(err);
    showAlert('error', 'Ocurrió un error inesperado.');
  }
}

/* ------------------------- Detección de página ----------------------------- */
function isProductDetailPage() {
  return location.pathname.endsWith('product.html');
}

/* ------------------------- Branding / acento --------------------------------*/
function applyBranding() {
  const nameEls = ['storeName','storeNameHeading','storeNameFooter'];
  for (const id of nameEls) {
    const el = document.getElementById(id);
    if (el && typeof window.STORE_NAME === 'string') el.textContent = window.STORE_NAME;
  }
  const hero = document.getElementById('heroTagline');
  if (hero && typeof window.HERO_TAGLINE === 'string') hero.textContent = window.HERO_TAGLINE;
  document.title = `${window.STORE_NAME || 'Tienda'} — Café y accesorios`;

  // Acento
  const bg=`bg-${window.PRIMARY_COLOR}`, txt=`text-${window.PRIMARY_COLOR}`, bd=`border-${window.PRIMARY_COLOR}`, rg=`ring-${window.PRIMARY_COLOR}`;
  document.querySelectorAll('.accent-bg').forEach(el=>el.classList.add(bg));
  document.querySelectorAll('.accent-text').forEach(el=>el.classList.add(txt));
  document.querySelectorAll('.accent-border').forEach(el=>el.classList.add(bd));
  document.querySelectorAll('.accent-ring').forEach(el=>el.classList.add(rg));
}

/* ------------------------- Carga con cache-busting ------------------------- */
async function loadProducts() {
  try {
    const res = await fetch(`./data/products.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Fallo cargando products.json. Intento fallback.', err);
    const node = document.getElementById('products-fallback');
    try {
      return JSON.parse(node?.textContent || '[]');
    } catch {
      return [];
    }
  }
}

/* ------------------------- LISTA: búsqueda, filtro y render ---------------- */
function wireListUI(products) {
  const s = document.getElementById('searchInput');
  const t = document.getElementById('tagFilter');
  const waBtn = document.getElementById('waContactBtn');
  const form = document.getElementById('contactForm');

  if (s) s.addEventListener('input', () => renderProducts(products));
  if (t) t.addEventListener('change', () => renderProducts(products));
  if (waBtn) waBtn.addEventListener('click', () => {
    openWhatsApp(`Hola, me gustaría obtener más información sobre ${window.STORE_NAME}.`);
  });

  if (form) form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('name').value || '').trim();
    const email = (document.getElementById('email').value || '').trim();
    const message = (document.getElementById('message').value || '').trim();
    if (!name || !email || !message) return showAlert('warning','Completa todos los campos.');
    openWhatsApp(`Hola, soy ${name} (${email}).\nMensaje: ${message}`);
  });
}

function populateTagFilter(products) {
  const select = document.getElementById('tagFilter');
  if (!select) return;
  const base = select.querySelector('option[value=""]');
  select.innerHTML = '';
  if (base) select.appendChild(base);
  const tags = Array.from(new Set(products.map(p => (p.tag||'').toLowerCase()))).filter(Boolean).sort();
  for (const t of tags) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    select.appendChild(opt);
  }
}

function renderProducts(allProducts) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const tag = (document.getElementById('tagFilter')?.value || '');

  const filtered = allProducts.filter(p => {
    const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q);
    const matchesTag = !tag || p.tag === tag;
    return matchesQuery && matchesTag;
  });

  if (!filtered.length) return setEmptyState('No encontramos productos con esos filtros.');

  for (const product of filtered) {
    const card = document.createElement('article');
    card.className = 'group bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition';

    card.innerHTML = `
      <a href="./product.html?id=${encodeURIComponent(product.id)}" class="block">
        <div class="relative aspect-[4/3] bg-stone-100 overflow-hidden">
          <img src="${product.image}" alt="${escapeHtml(product.name)}"
               class="w-full h-full object-cover transition duration-200 group-hover:scale-[1.02]"
               onerror="this.src='./assets/placeholder.svg';"/>
          <!-- overlay oscuro suave -->
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition"></div>
        </div>
      </a>
      <div class="p-4">
        <h3 class="font-semibold text-lg leading-snug">
          <a href="./product.html?id=${encodeURIComponent(product.id)}" class="hover:underline">
            ${escapeHtml(product.name)}
          </a>
        </h3>
        <p class="mt-1 text-sm text-stone-600">${escapeHtml(product.description)}</p>
        <div class="mt-3 flex items-center justify-between">
          <span class="font-semibold">$${Number(product.price).toFixed(2)}</span>
          <span class="inline-flex items-center text-xs px-2 py-1 rounded-full bg-stone-100 border border-stone-200">
            ${escapeHtml(product.tag)}
          </span>
        </div>
        <button class="mt-4 w-full accent-bg text-white px-4 py-2.5 rounded-lg shadow hover:opacity-90 transition">
          Comprar por WhatsApp
        </button>
      </div>
    `;
    grid.appendChild(card);

    card.querySelector('button')?.addEventListener('click', () => goToWhatsApp(product));
  }
}

/* ------------------------- DETALLE: product.html --------------------------- */
function renderProductDetail(p) {
  // Branding en la cabecera
  const n1 = document.getElementById('storeName');
  const n2 = document.getElementById('storeNameFooter');
  if (n1) n1.textContent = window.STORE_NAME;
  if (n2) n2.textContent = window.STORE_NAME;

  // Pinta datos
  document.getElementById('detailName').textContent = p.name;
  document.getElementById('detailDesc').textContent = p.description;
  document.getElementById('detailPrice').textContent = `$${Number(p.price).toFixed(2)}`;
  document.getElementById('detailTag').textContent = p.tag || '';
  const img = document.getElementById('detailImage');
  img.src = p.image || './assets/placeholder.svg';
  img.alt = p.name;
  img.onerror = () => { img.src = './assets/placeholder.svg'; };

  // Botón WhatsApp
  document.getElementById('detailBuy').addEventListener('click', () => {
    const text = `Hola, me interesa *${p.name}* (USD ${Number(p.price).toFixed(2)}). ¿Está disponible?`;
    openWhatsApp(text);
  });

  // Acento (aplicar clases dinámicas)
  const bg=`bg-${window.PRIMARY_COLOR}`, bd=`border-${window.PRIMARY_COLOR}`;
  document.getElementById('detailBuy').classList.add(bg);
  document.querySelectorAll('.accent-border').forEach(el => el.classList.add(bd));
}

/* ------------------------- Skeleton / Empty / Alertas ---------------------- */
function skeletonCards(n=6){
  const grid=document.getElementById('productsGrid'); if(!grid) return;
  grid.innerHTML='';
  for(let i=0;i<n;i++){
    const sk=document.createElement('div');
    sk.className='animate-pulse bg-white rounded-xl border border-stone-200 overflow-hidden';
    sk.innerHTML=`
      <div class="aspect-[4/3] bg-stone-100"></div>
      <div class="p-4 space-y-3">
        <div class="h-4 bg-stone-200 rounded w-3/4"></div>
        <div class="h-3 bg-stone-200 rounded w-5/6"></div>
        <div class="h-3 bg-stone-200 rounded w-2/3"></div>
        <div class="h-10 bg-stone-200 rounded mt-2"></div>
      </div>`;
    grid.appendChild(sk);
  }
}
function setEmptyState(msg){
  const grid=document.getElementById('productsGrid'); if(!grid) return;
  grid.innerHTML = `<div class="sm:col-span-2 lg:col-span-3 text-center text-stone-500">${escapeHtml(msg)}</div>`;
}
function showAlert(type, msg){
  const bar=document.getElementById('alertBar'); if(!bar) return;
  const styles={success:'bg-green-50 border border-green-200 text-green-800',
                warning:'bg-amber-50 border border-amber-200 text-amber-800',
                error:'bg-red-50 border border-red-200 text-red-800'};
  const icon={success:'✔',warning:'⚠',error:'⛔'};
  bar.className='mx-auto max-w-6xl px-4 py-3 rounded-b-xl shadow mt-4 mb-2 '+(styles[type]||styles.warning);
  bar.setAttribute('role','alert');
  bar.innerHTML=`<div class="flex items-start gap-3"><div class="text-lg">${icon[type]||'ℹ'}</div>
    <div class="flex-1">${escapeHtml(msg)}</div>
    <button aria-label="Cerrar" class="ml-2 px-2 py-1 rounded hover:bg-black/5">✕</button></div>`;
  bar.querySelector('button')?.addEventListener('click',()=>bar.classList.add('hidden'));
}

/* ------------------------- WhatsApp helpers -------------------------------- */
function goToWhatsApp(product){
  const text=`Hola, me interesa *${product.name}* (USD ${Number(product.price).toFixed(2)}). ¿Está disponible?`;
  openWhatsApp(text);
}
function openWhatsApp(message){
  const num=window.WHATSAPP_NUMBER||'';
  if(!/^\d{8,15}$/.test(num)){ showAlert('error','WHATSAPP_NUMBER inválido (js/config.js).'); return; }
  const url=`https://wa.me/${num}?text=${encodeURIComponent(message||'')}`;
  try{ window.open(url,'_blank'); }catch{ location.href=url; }
}

/* ------------------------- Utils ------------------------------------------ */
function escapeHtml(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");}
function getQuery(key){return new URLSearchParams(location.search).get(key);}
