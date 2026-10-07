const HEX = /^#[0-9A-Fa-f]{6}$/;

/** Oscurece un color #RRGGBB un porcentaje (0-1) — para el estado :hover. */
export function darken(hex, amount = 0.15) {
  if (!HEX.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.max(0, Math.round(((n >> shift) & 255) * (1 - amount)));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

/** Texto blanco o negro según luminancia, para que el botón primario siempre sea legible. */
export function readableInk(hex) {
  if (!HEX.test(hex)) return '#FFFFFF';
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#111111' : '#FFFFFF';
}

/** Aplica los colores de marca de la empresa a las variables CSS (si no hay, deja los de variables.css). */
export function applyBrand(business, root = document.documentElement) {
  const { primaryColor, secondaryColor } = business ?? {};
  if (HEX.test(primaryColor ?? '')) {
    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--color-primary-hover', darken(primaryColor));
    root.style.setProperty('--color-primary-ink', readableInk(primaryColor));
  } else {
    ['--color-primary', '--color-primary-hover', '--color-primary-ink'].forEach((v) => root.style.removeProperty(v));
  }
  if (HEX.test(secondaryColor ?? '')) root.style.setProperty('--color-secondary', secondaryColor);
  else root.style.removeProperty('--color-secondary');
}
