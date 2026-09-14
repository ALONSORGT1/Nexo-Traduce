import { ApiClient } from './api.js';
import { ChatController } from './chat.js';

const api = new ApiClient();
const status = document.querySelector('#status');
export function notify(text, error = false) { status.textContent = text; status.classList.toggle('error', error); }
new ChatController(api, notify);

const dialog = document.querySelector('#connectionDialog');
document.querySelector('#connectionButton').addEventListener('click', () => {
  document.querySelector('#backendUrl').value = api.base;
  document.querySelector('#accessCode').value = api.accessCode;
  dialog.showModal();
});
document.querySelector('#closeConnection').addEventListener('click', () => dialog.close());
document.querySelector('#connectionForm').addEventListener('submit', async event => {
  event.preventDefault();
  const message = document.querySelector('#connectionStatus');
  const url = new URL(document.querySelector('#backendUrl').value);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    message.textContent = 'Usa una dirección HTTPS o localhost.'; return;
  }
  api.base = url.origin;
  api.accessCode = document.querySelector('#accessCode').value;
  message.textContent = 'Comprobando conexión…';
  try {
    const state = await api.request('health');
    message.textContent = state.ready ? `Servidor disponible.${state.access_required ? ' Requiere código de acceso; se validará al traducir.' : ''}` : 'Servidor disponible, pero falta configurar su API key.';
  } catch (error) { message.textContent = error.message; }
});

document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.mode !== 'chat') { notify('Este módulo se está preparando.'); return; }
}));
