import { showToast } from '../components/toast.js';

/**
 * initSetupScreen
 * ---------------------------------------------------------
 * Responsabilidad: capturar el formulario "Crea tu negocio" y
 * delegar todo a setupUseCases.setupBusiness(). Al terminar, hace
 * login automático con las credenciales recién creadas (para no
 * hacer que el admin tenga que loguearse dos veces seguidas) y
 * llama a onComplete() para que main.js muestre el panel.
 */
export function initSetupScreen({ setupUseCases, authUseCases, onComplete }) {
  const form = document.getElementById('setupForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');

    const payload = {
      businessName: data.get('businessName').trim(),
      nit: data.get('nit')?.trim() || null,
      branchName: data.get('branchName').trim(),
      cashPointName: data.get('cashPointName').trim(),
      adminName: data.get('adminName').trim(),
      username: data.get('username').trim(),
      password: data.get('password'),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando...';

    try {
      await setupUseCases.setupBusiness(payload);
      const session = await authUseCases.login(payload.username, payload.password);
      showToast(`Sistema creado. ¡Bienvenido, ${session.user.name}!`, 'success');
      onComplete(session);
    } catch (error) {
      showToast(error.message, 'danger');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Crear sistema';
    }
  });
}
