/* ============================================================================
   Configuración rápida (edita estos valores)
   ---------------------------------------------------------------------------
   - STORE_NAME: Nombre visible de la tienda
   - WHATSAPP_NUMBER: Número sin "+" ni espacios, solo dígitos (ej: "50760000000")
   - PRIMARY_COLOR: Clase Tailwind para el acento (ej: "amber-700")
     Sugeridos (sin build): amber-500/600/700/800, orange-500/600/700/800, stone-500/600/700/800
   - HERO_TAGLINE: Subtítulo que aparece en el hero
   ========================================================================== */

const STORE_NAME = "Café Minimal";
const WHATSAPP_NUMBER = "50760000000";
const PRIMARY_COLOR = "amber-700";
const HERO_TAGLINE = "Tostado fresco, molido a tu gusto. Pide por WhatsApp en un click.";

/* ============================================================================
   Exporta al scope global (para main.js)
   ========================================================================== */
window.STORE_NAME = STORE_NAME;
window.WHATSAPP_NUMBER = WHATSAPP_NUMBER;
window.PRIMARY_COLOR = PRIMARY_COLOR;
window.HERO_TAGLINE = HERO_TAGLINE;
