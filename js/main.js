/* ============================================================================
   Tienda mínima - lógica de UI con errores mejorados
   ========================================================================== */

// Asegura que init corra incluso si DOMContentLoaded ya pasó
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

async function init() {
  try {
    // Validar existencia de elementos críticos del DOM
    const domNeeded = ['storeName','storeNameHeading','storeNameFooter','heroTagline',
      'productsGrid','searchInput','tagFilter','waContactBtn','contactForm'];
    for (const id of domNeeded) {
      if (!document.getElementById(id)) {
        showAlert('error', `Falta elemento del DOM: #${id}. Revisa index.html`);
        console.error(`Elemento faltante: #${id}`);
        return;
      }
    }

    // Validar config global
    if (typeof window.STORE_NAME !== 'string' ||
        typeof window.WHATSAPP_NUMBER !== 'string' ||
        typeof window.PRIMARY_COLOR !== 'string' ||
        typeof window.HERO_TAGLINE !== 'string') {
      showAlert('error', 'No se cargó js/config.js correctamente.');
      console.error('config.js no disponible o mal definido');
      return;
    }

    // Montar textos de marca
    document.getElementById('storeName').textContent = window.STORE_NAME;
    document.getElementById('storeNameHeading').textContent = window.STORE_NAME;
    document.getElementById('storeNameFooter').textContent = window.STORE_NAME;
    document.getElementById('heroTagline').textContent = window.HERO_TAGLINE;
    document.title = `${window.STORE_NAME} — Café y accesorios`;

    // Validar WhatsApp Number
    if (!/^\d{8,15}$/.test(window.WHATSAPP_NUMBER)) {
      showAlert('warning', 'WHATSAPP_NUMBER no parece válido. Debe tener 8–15 dígitos sin "+".');
    }

    // Aplicar color de acento (usa clases en safelist)
    applyAccent(window.PRIMARY_COLOR);

    // Estado: Skeletons mientras se carga
    skeletonCards(6);

    // Cargar productos
    const products = await loadProducts();

    if (!Array.isArray(products)) {
      showAlert('error', 'El archivo products.json no es un arreglo válido.');
      setEmptyState('No se pudieron leer los productos. Revisa data/products.json.');
      return;
    }
    if (products.length === 0) {
      showAlert('warning', 'No hay productos para mostrar.');
      setEmptyState('No hay productos disponibles.');
    }

    // Poblar filtro por tag y render inicial
    populateTagFilter(products);
    renderProducts(products);

    // Búsqueda / filtro
    const searchInput = document.getElementById('searchInput');
    const tagFilter = document.getElementById('tagFilter');
    searchInput.addEventListener('input', () => renderProducts(products));
    tagFilter.addEventListener('change', () => renderProducts(products));

    // WhatsApp contacto (botón)
    document.getElementById('waContactBtn').addEventListener('click', () => {
      const msg = `Hola, me gustaría obtener más información sobre ${window.STORE_NAME}.`;
      openWhatsApp(msg);
    });

    // Formulario -> WhatsApp
    const form = document.getElementById('contactForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = (document.getElementById('name').value || '').trim();
      const email = (document.getElementById('email').value || '').trim();
      const message = (document.getElementById('message').value || '').trim();

      if (!name || !email || !message) {
        showAlert('warning', 'Por favor completa todos los campos del formulario.');
        return;
      }

      const text = `Hola, soy ${name} (${email}).\nMensaje: ${message}`;
      openWhatsApp(text);
    });

    // Éxito inicial (opcional, comentado si no quieres alert)
    // showAlert('success', 'Productos cargados correctamente.');

  } catch (err) {
    console.error(err);
    showAlert('error', 'Ocurrió un error inesperado al iniciar la tienda.');
  }
}

/* ------------------------- Carga productos con fallback -------------------- */
async function loadProducts() {
  try {
    const res = await fetch('./data/products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Fallo cargando products.json, uso fallback:', err);
    const node = document.getElementById('products-fallback');
    try {
      const data = JSON.parse(node?.textContent || '[]');
      if (!data.length) {
        showAlert('error', 'No se pudo cargar data/products.json ni el fallback.');
      } else {
        showAlert('warning', 'Usando datos locales de emergencia (fallback).');
      }
      return data;
    } catch {
      showAlert('error', 'Fallback de productos inválido en index.html.');
      return [];
    }
  }
}

/* ------------------------- Render de productos ----------------------------- */
function renderProducts(allProducts) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  grid.innerHTML = '';

  const q = (document.getElementById('searchInput').value || '').toLowerCase();
  const tag = document.getElementById('tagFilter').value;

  const filtered = allProducts.filter(p => {
    const matchesQuery =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tag.toLowerCase().includes(q);
    const matchesTag = !tag || p.tag === tag;
    return matchesQuery && matchesTag;
  });

  if (filtered.length === 0) {
    setEmptyState('No encontramos productos con esos filtros.');
    return;
  }

  for (const product of filtered) {
    const card = document.createElement('article');
    card.className = 'bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition';

    card.innerHTML = `
      <div class="aspect-[4/3] bg-stone-100 overflow-hidden">
        <img src="${product.image}"
             alt="${escapeHtml(product.name)}"
             class="w-full h-full object-cover"
             onerror="this.src='./assets/placeholder.svg';" />
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
        <button
          class="mt-4 w-full accent-bg text-white px-4 py-2.5 rounded-lg shadow hover:opacity-90 transition"
          data-product-id="${product.id}">
          Comprar por WhatsApp
        </button>
      </div>
    `;
    grid.appendChild(card);

    const btn = card.querySelector('button');
    btn.addEventListener('click', () => goToWhatsApp(product));
  }
}

/* ------------------------- Skeletons y estados ----------------------------- */
function skeletonCards(n = 6) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const sk = document.createElement('div');
    sk.className = 'animate-pulse bg-white rounded-xl border border-stone-200 overflow-hidden';
    sk.innerHTML = `
      <div class="aspect-[4/3] bg-stone-100"></div>
      <div class="p-4 space-y-3">
        <div class="h-4 bg-stone-200 rounded w-3/4"></div>
        <div class="h-3 bg-stone-200 rounded w-5/6"></div>
        <div class="h-3 bg-stone-200 rounded w-2/3"></div>
        <div class="h-10 bg-stone-200 rounded mt-2"></div>
      </div>
    `;
    grid.appendChild(sk);
  }
}

function setEmptyState(message) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = `
    <div class="sm:col-span-2 lg:col-span-3 text-center text-stone-500">${escapeHtml(message)}</div>
  `;
}

/* ------------------------- Filtro por tag ---------------------------------- */
function populateTagFilter(products) {
  const select = document.getElementById('tagFilter');
  if (!select) return;
  const base = select.querySelector('option[value=""]');
  select.innerHTML = ''; // limpia
  if (base) select.appendChild(base);

  const tags = Array.from(new Set(products.map(p => (p.tag || '').toLowerCase()))).filter(Boolean).sort();
  for (const t of tags) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    select.appendChild(opt);
  }
}

/* ------------------------- WhatsApp helpers -------------------------------- */
function goToWhatsApp(product) {
  const text = `Hola, me interesa *${product.name}* (USD ${Number(product.price).toFixed(2)}). ¿Está disponible?`;
  openWhatsApp(text);
}

function openWhatsApp(message) {
  const num = window.WHATSAPP_NUMBER || '';
  if (!/^\d{8,15}$/.test(num)) {
    showAlert('error', 'WHATSAPP_NUMBER inválido. Actualiza js/config.js (solo dígitos, 8–15).');
    return;
  }
  const base = `https://wa.me/${num}`;
  const text = encodeURIComponent(message || '');
  const url = `${base}?text=${text}`;
  try {
    window.open(url, '_blank');
  } catch {
    // Fallback: redirigir en misma pestaña
    location.href = url;
  }
}

/* ------------------------- Acento de color -------------------------------- */
function applyAccent(primary) {
  const bgEls = document.querySelectorAll('.accent-bg');
  const textEls = document.querySelectorAll('.accent-text');
  const borderEls = document.querySelectorAll('.accent-border');
  const ringEls = document.querySelectorAll('.accent-ring');

  const bgClass = `bg-${primary}`;
  const textClass = `text-${primary}`;
  const borderClass = `border-${primary}`;
  const ringClass = `ring-${primary}`;

  bgEls.forEach(el => el.classList.add(bgClass));
  textEls.forEach(el => el.classList.add(textClass));
  borderEls.forEach(el => el.classList.add(borderClass));
  ringEls.forEach(el => el.classList.add(ringClass));
}

/* ------------------------- Alertas accesibles ------------------------------ */
function showAlert(type, message) {
  const bar = document.getElementById('alertBar');
  if (!bar) return;

  const styles = {
    success: 'bg-green-50 border border-green-200 text-green-800',
    warning: 'bg-amber-50 border border-amber-200 text-amber-800',
    error:   'bg-red-50 border border-red-200 text-red-800'
  };
  const icon = {
    success: '✔',
    warning: '⚠',
    error:   '⛔'
  };

  bar.className = '';
  bar.classList.add('sticky','top-14','z-40','mx-auto','max-w-6xl','px-4','py-3','rounded-b-xl','shadow','mt-[-1px]','mb-2', ...(styles[type] || styles.warning).split(' '));
  bar.setAttribute('role', 'alert');
  bar.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="text-lg leading-none">${icon[type] || 'ℹ'}</div>
      <div class="flex-1">${escapeHtml(message)}</div>
      <button aria-label="Cerrar aviso" class="ml-2 px-2 py-1 rounded hover:bg-black/5">✕</button>
    </div>
  `;
  bar.querySelector('button')?.addEventListener('click', () => {
    bar.classList.add('hidden');
  });
}

/* ------------------------- Utilidades -------------------------------------- */
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
