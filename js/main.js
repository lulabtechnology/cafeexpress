/* ============================================================================
   Tienda mínima - lógica de UI
   - Carga productos de /data/products.json; si falla (archivo local), usa fallback embebido
   - Renderiza tarjetas
   - Búsqueda y filtro por tag
   - Compra por WhatsApp (wa.me)
   - Contacto: botón y formulario abren WhatsApp
   - Acento de color con Tailwind (safelist configurado en index.html)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', init);

async function init() {
  // Texto de marca y tagline
  document.getElementById('storeName').textContent = window.STORE_NAME;
  document.getElementById('storeNameHeading').textContent = window.STORE_NAME;
  document.getElementById('storeNameFooter').textContent = window.STORE_NAME;
  document.getElementById('heroTagline').textContent = window.HERO_TAGLINE;
  document.title = `${window.STORE_NAME} — Café y accesorios`;

  // Aplicar color de acento (usa clases dinámicas y safelist)
  applyAccent(window.PRIMARY_COLOR);

  // Cargar productos
  const products = await loadProducts();

  // Poblar filtro por tag
  populateTagFilter(products);

  // Render inicial
  renderProducts(products);

  // Buscar / filtrar
  const searchInput = document.getElementById('searchInput');
  const tagFilter = document.getElementById('tagFilter');
  searchInput.addEventListener('input', () => renderProducts(products));
  tagFilter.addEventListener('change', () => renderProducts(products));

  // Contacto por WhatsApp (botón)
  document.getElementById('waContactBtn').addEventListener('click', () => {
    const msg = `Hola, me gustaría obtener más información sobre ${window.STORE_NAME}.`;
    const url = buildWhatsAppUrl(msg);
    window.open(url, '_blank');
  });

  // Contacto por WhatsApp (formulario)
  document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = (document.getElementById('name').value || '').trim();
    const email = (document.getElementById('email').value || '').trim();
    const message = (document.getElementById('message').value || '').trim();
    const text =
      `Hola, soy ${name} (${email}).\n` +
      `Mensaje: ${message}`;
    const url = buildWhatsAppUrl(text);
    window.open(url, '_blank');
  });
}

/* ------------------------- Productos: carga con fallback ------------------- */
async function loadProducts() {
  try {
    const res = await fetch('./data/products.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar products.json');
    return await res.json();
  } catch (err) {
    // Fallback local (funciona al abrir el archivo sin servidor)
    const node = document.getElementById('products-fallback');
    try {
      return JSON.parse(node.textContent);
    } catch {
      console.error('No hay datos de productos válidos.');
      return [];
    }
  }
}

/* ------------------------- Render de productos ----------------------------- */
function renderProducts(allProducts) {
  const grid = document.getElementById('productsGrid');
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
    grid.innerHTML = `
      <div class="sm:col-span-2 lg:col-span-3 text-center text-stone-500">
        No encontramos productos con esos filtros.
      </div>`;
    return;
  }

  for (const product of filtered) {
    const card = document.createElement('article');
    card.className = [
      'bg-white', 'rounded-xl', 'border', 'border-stone-200', 'overflow-hidden',
      'shadow-sm', 'hover:shadow-md', 'transition'
    ].join(' ');

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

    // Acción de compra
    const btn = card.querySelector('button');
    btn.addEventListener('click', () => goToWhatsApp(product));
  }
}

/* ------------------------- Filtro por tag ---------------------------------- */
function populateTagFilter(products) {
  const select = document.getElementById('tagFilter');
  const tags = Array.from(new Set(products.map(p => p.tag))).sort();
  for (const t of tags) {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    select.appendChild(opt);
  }
}

/* ------------------------- WhatsApp helpers -------------------------------- */
function goToWhatsApp(product) {
  // Mensaje recomendado:
  // "Hola, me interesa *{PRODUCTO}* (USD {PRECIO}). ¿Está disponible?"
  const text = `Hola, me interesa *${product.name}* (USD ${Number(product.price).toFixed(2)}). ¿Está disponible?`;
  const url = buildWhatsAppUrl(text);
  window.open(url, '_blank');
}

function buildWhatsAppUrl(message) {
  const base = `https://wa.me/${window.WHATSAPP_NUMBER}`;
  const text = encodeURIComponent(message);
  return `${base}?text=${text}`;
}

/* ------------------------- Acento de color --------------------------------- */
function applyAccent(primary) {
  // Añade clases dinámicas a elementos marcados con las utilidades "accent-*"
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

/* ------------------------- Utilidades -------------------------------------- */
function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
