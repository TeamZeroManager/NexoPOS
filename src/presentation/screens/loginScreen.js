import { showToast } from '../components/toast.js';

/**
 * initLoginScreen
 * ---------------------------------------------------------
 * Responsabilidad: capturar usuario/contraseña y delegar a
 * authUseCases.login(). El mensaje de error es siempre genérico
 * ("Usuario o contraseña incorrectos") — ver authRules.js.
 */
export function initLoginScreen({ authUseCases, onLoggedIn }) {
  const form = document.getElementById('loginForm');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const username = data.get('username').trim();
    const password = data.get('password');
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    try {
      const session = await authUseCases.login(username, password);
      form.reset();
      onLoggedIn(session);
    } catch (error) {
      showToast(error.message, 'danger');
    } finally {
      submitBtn.disabled = false;
    }
  });
}
