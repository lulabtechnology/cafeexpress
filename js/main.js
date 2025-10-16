/* ============================================================================
   Tienda mínima — manejo de errores + logs + cache-busting
   ========================================================================== */

log('boot', 'Inicializando tienda…');

// Ejecuta init incluso si DOM ya está listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

async function init() {
  try {
    // DOM requerido
    const ids = ['storeName','storeNameHeading','storeNameFooter','heroTagline',
      'productsGrid','searchInput','tagFilter','waContactBtn','contactForm'];
    for (const id of ids) {
      if (!document.getElementById(id)) {
        showAlert('error', `Falta elemento del DOM: #${id}`);
        return;
      }
    }

    // Config requerida
    if ([window.STORE_NAME,window.WHATSAPP_NUMBER,window.PRIMARY_COLOR,window.HERO_TAGLINE]
      .some(v => typeof v !== 'string')) {
      showAlert('error','No se cargó js/config.js correctamente.');
      return;
    }

    // Branding
    document.getElementById('storeName').textContent = window.STORE_NAME;
    document.getElementById('storeNameHeading').textContent = window.STORE_NAME;
    document.getElementById('storeNameFooter').textContent = window.STORE_NAME;
    document.getElementById('heroTagline').textContent = window.HERO_TAGLINE;
    document.title = `${window.STORE_NAME} — Café y accesorios`;

    // Validar número de WhatsApp
    if (!/^\d{8,15}$/.test(window.WHATSAPP_NUMBER)) {
      showAlert('warning','WHATSAPP_NUMBER no parece válido (8–15 dígitos, sin "+").');
    }

    // Acento
    applyAccent(window.PRIMARY_COLOR);

    // Skeletons mientras carga
    skeletonCards(6);

    // Cargar productos
    const products = await loadProducts();
    log('data', `Productos cargados: ${Array.isArray(products) ? products.length : 'inválido'}`);

    if (!Array.isArray(products)) {
      showAlert('error','products.json no es un arreglo.');
      return setEmptyState('No se pudieron leer los productos.');
    }
    if (products.length === 0) {
      showAlert('warning','No hay productos para mostrar.');
      return setEmptyState('No hay productos disponibles.');
    }

    populateTagFilter(products);
    renderProducts(products);

    // Filtros
    document.getElementById('searchInput').addEventListener('input', () => renderProducts(products));
    document.getElementById('tagFilter').addEventListener('change', () => renderProducts(products));

    // WhatsApp contacto
    document.getElementById('waContactBtn').addEventListener('click', () => {
      openWhatsApp(`Hola, me gustaría obtener más información sobre ${window.STORE_NAME}.`);
    });

    // Formulario
    document.getElementById('contactForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('name').value || '').trim();
      const email = (document.getElementById('email').value || '').trim();
      const message = (document.getElementById('message').value || '').trim();
      if (!name || !email || !message) {
        showAlert('warning','Completa todos los campos.');
        return;
      }
      openWhatsApp(`Hola, soy ${name} (${email}).\nMensaje: ${message}`);
    });

  } catch (err) {
    console.error(err);
    showAlert('error','Error inesperado al iniciar la tienda.');
  }
}

/* ------------------------- Carga con cache-busting ------------------------- */
async function loadProducts() {
  const url = `./data/products.json?v=${Date.now()}`; // evita caché CDN
  try {
    log('fetch','Solicitando products.json…');
    const res = await fetch(url, { cache: 'no-store' });
    log('fetch',`HTTP ${res.status}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Fallo fetch products.json → uso fallback', err);
    const node = document.getElementById('products-fallback');
    try {
      const data = JSON.parse(node?.textContent || '[]');
      if (!data.length) {
        showAlert('error','No se pudo cargar data/products.json ni el fallback.');
      } else {
        showAlert('warning','Usando datos locales de emergencia (fallback).');
      }
      return data;
    } catch {
      showAlert('error','Fallback de productos inválido en index.html.');
      return [];
    }
  }
}

/* ------------------------- Render ----------------------------------------- */
function renderProducts(allProducts) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  const tag = document.getElementById('tagFilter').value;

  const filtered = allProducts.filter(p => {
    const matchesQuery = !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tag.toLowerCase().includes(q);
    const matchesTag = !tag || p.tag === tag;
    return matchesQuery && matchesTag;
  });

  if (filtered.length === 0) {
    return setEmptyState('No encontramos productos con esos filtros.');
  }

  for (const product of filtered) {
    const card = document.createElement('article');
    card.className = 'bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition';
    card.innerHTML = `
      <div class="aspect-[4/3] bg-stone-100 overflow-hidden">
        <img src="${product.image}" alt="${escapeHtml(product.name)}"
             class="w-full h-full object-cover"
             onerror="this.src='./assets/placeholder.svg';"/>
      </div>
      <div class="p-4">
        <h3 class="font-semibold text-lg leading-snug">${escapeHtml(product.name)}</h3>
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
      </div>`;
    grid.appendChild(card);

    const btn = card.querySelector('button');
    btn.addEventListener('click', () => goToWhatsApp(product));
  }
}

/* ------------------------- Skeleton / Empty -------------------------------- */
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

/* ------------------------- Filtro por tag ---------------------------------- */
function populateTagFilter(products){
  const sel=document.getElementById('tagFilter'); if(!sel) return;
  const base=sel.querySelector('option[value=""]'); sel.innerHTML=''; if(base) sel.appendChild(base);
  const tags=[...new Set(products.map(p=>(p.tag||'').toLowerCase()))].filter(Boolean).sort();
  for(const t of tags){
    const o=document.createElement('option'); o.value=t; o.textContent=t.charAt(0).toUpperCase()+t.slice(1);
    sel.appendChild(o);
  }
}

/* ------------------------- WhatsApp ---------------------------------------- */
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

/* ------------------------- Acento ----------------------------------------- */
function applyAccent(primary){
  const bg=`bg-${primary}`, txt=`text-${primary}`, bd=`border-${primary}`, rg=`ring-${primary}`;
  document.querySelectorAll('.accent-bg').forEach(el=>el.classList.add(bg));
  document.querySelectorAll('.accent-text').forEach(el=>el.classList.add(txt));
  document.querySelectorAll('.accent-border').forEach(el=>el.classList.add(bd));
  document.querySelectorAll('.accent-ring').forEach(el=>el.classList.add(rg));
}

/* ------------------------- Alertas ---------------------------------------- */
function showAlert(type, msg){
  const bar=document.getElementById('alertBar'); if(!bar) return;
  const styles={success:'bg-green-50 border border-green-200 text-green-800',
                warning:'bg-amber-50 border border-amber-200 text-amber-800',
                error:'bg-red-50 border border-red-200 text-red-800'};
  const icon={success:'✔',warning:'⚠',error:'⛔'};
  bar.className='sticky top-14 z-40 mx-auto max-w-6xl px-4 py-3 rounded-b-xl shadow mt-[-1px] mb-2 '+(styles[type]||styles.warning);
  bar.setAttribute('role','alert');
  bar.innerHTML=`<div class="flex items-start gap-3"><div class="text-lg">${icon[type]||'ℹ'}</div>
    <div class="flex-1">${escapeHtml(msg)}</div>
    <button aria-label="Cerrar" class="ml-2 px-2 py-1 rounded hover:bg-black/5">✕</button></div>`;
  bar.querySelector('button')?.addEventListener('click',()=>bar.classList.add('hidden'));
}

/* ------------------------- Utilidades ------------------------------------- */
function escapeHtml(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");}
function log(scope,...args){console.log(`[store:${scope}]`,...args);}
