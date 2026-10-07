import { applyBrand } from '../../shared/utils/theme.js';
import { el, button, labeled } from '../components/dom.js';
import { showToast } from '../components/toast.js';

/** Configuración: datos del negocio, logo y colores de marca (se aplican al instante). */
export function makeConfiguracionScreen({ businessUseCases, onSaved }) {
  const container = document.getElementById('pageConfiguracion');

  async function render() {
    const b = (await businessUseCases.getCurrent()) ?? {};
    const input = (name, value, props = {}) => el('input', { name, value: value ?? '', className: 'search-input', ...props });
    const f = {
      name: input('name', b.name, { required: true }), nit: input('nit', b.nit),
      address: input('address', b.address), phone: input('phone', b.phone, { type: 'tel' }),
      email: input('email', b.email, { type: 'email' }), logoUrl: input('logoUrl', b.logoUrl, { placeholder: 'https://…' }),
      primaryColor: input('primaryColor', b.primaryColor || '#0F6B4C', { type: 'color', style: 'height:40px;padding:2px;' }),
      secondaryColor: input('secondaryColor', b.secondaryColor || '#F5A623', { type: 'color', style: 'height:40px;padding:2px;' }),
      receiptFooter: el('textarea', { name: 'receiptFooter', className: 'search-input', rows: 2, value: b.receiptFooter ?? '', placeholder: 'Ej: Gracias por su compra' }),
    };
    const preview = el('img', { alt: '', style: 'max-height:56px;max-width:160px;object-fit:contain;display:none;' });
    const showLogo = () => { preview.style.display = f.logoUrl.value.startsWith('https://') ? 'block' : 'none'; if (preview.style.display === 'block') preview.src = f.logoUrl.value; };
    f.logoUrl.addEventListener('input', showLogo); showLogo();

    const save = button('Guardar cambios', async () => {
      const values = Object.fromEntries(Object.entries(f).map(([k, node]) => [k, node.value]));
      try {
        const updated = await businessUseCases.update(values);
        applyBrand(updated);
        onSaved?.(updated);
        showToast('Configuración guardada', 'success');
      } catch (e) { showToast(e.message, 'danger'); }
    }, 'primary');
    const reset = button('Restablecer colores', () => { f.primaryColor.value = '#0F6B4C'; f.secondaryColor.value = '#F5A623'; });

    const grid = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;';
    container.replaceChildren(el('div', { className: 'card-section', style: 'max-width:780px;display:flex;flex-direction:column;gap:16px;' }, [
      el('strong', { textContent: 'Datos del negocio' }),
      el('div', { style: grid }, [labeled('Nombre', f.name), labeled('NIT', f.nit), labeled('Dirección', f.address), labeled('Teléfono', f.phone), labeled('Correo', f.email)]),
      el('strong', { textContent: 'Marca' }),
      el('div', { style: grid }, [labeled('Logo (URL https)', f.logoUrl, 'Solo URLs seguras (https).'), labeled('Color primario', f.primaryColor), labeled('Color secundario', f.secondaryColor)]),
      preview,
      labeled('Mensaje al pie del recibo', f.receiptFooter),
      el('div', { style: 'display:flex;gap:8px;' }, [save, reset]),
    ]));
  }
  return { render };
}
