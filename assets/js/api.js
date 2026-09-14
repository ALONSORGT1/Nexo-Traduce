export class ApiClient {
  constructor() {
    this.base = window.NEXO_CONFIG?.apiBase || location.origin;
    this.accessCode = '';
  }
  async request(path, data, file = null) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 285000);
    try {
      const headers = {};
      if (this.accessCode) headers['X-Access-Code'] = this.accessCode;
      let body;
      if (file) {
        body = new FormData();
        body.append('file', file, file.name);
        Object.entries(data).forEach(([key, value]) => body.append(key, value));
      } else if (data) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(data);
      }
      const response = await fetch(`${this.base}/api/${path}`, {
        method: data ? 'POST' : 'GET', headers, body, signal: controller.signal,
      });
      const result = await response.json().catch(() => { throw new Error('El servidor no devolvió una respuesta válida. Revisa Conexión.'); });
      if (!response.ok) throw new Error(result.error || 'No se pudo completar la solicitud.');
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('La operación tardó demasiado. El servidor podría seguir procesándola.');
      if (error instanceof TypeError) throw new Error('No se pudo conectar con el servidor. Revisa tu conexión y la dirección del backend.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
}

export function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function download(text, name, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = element('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
