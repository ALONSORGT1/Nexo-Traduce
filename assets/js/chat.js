import { element, download } from './api.js';

export class ChatController {
  constructor(api, notify) {
    this.api = api; this.notify = notify; this.history = []; this.busy = false;
    this.form = document.querySelector('#chatForm');
    this.input = document.querySelector('#message');
    this.form.addEventListener('submit', event => { event.preventDefault(); this.send(); });
    this.input.addEventListener('input', () => {
      document.querySelector('#counter').textContent = `${this.input.value.length} / 6000`;
    });
    this.input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !matchMedia('(pointer: coarse)').matches) {
        event.preventDefault(); this.send();
      }
    });
    document.querySelector('#speaker').addEventListener('change', () => this.updateSpeaker());
    document.querySelector('#clearChat').addEventListener('click', () => this.clear());
    document.querySelector('#exportChat').addEventListener('click', () => download(
      this.history.map(x => `${x.sender}\nOriginal (${x.source}):\n${x.original}\n\nTraducción (${x.target}):\n${x.translation}`).join('\n\n———\n\n'),
      'nexo-conversacion.txt'));
    document.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
      this.input.value = button.dataset.example; this.input.dispatchEvent(new Event('input')); this.input.focus();
    }));
    this.updateSpeaker();
  }
  updateSpeaker() {
    const spanish = document.querySelector('#speaker').value === 'es';
    document.querySelector('#chatDirection').textContent = spanish ? 'Español → Inglés' : 'Inglés → Español';
    this.input.placeholder = spanish ? 'Escribe en español para la otra persona…' : 'Write in English for the other person…';
  }
  async send() {
    if (this.busy) return;
    const text = this.input.value.trim();
    if (!text) return this.notify('Escribe un mensaje antes de traducir.', true);
    const source = document.querySelector('#speaker').value;
    this.busy = true; this.lock(true); this.notify('Traduciendo el mensaje…');
    try {
      const history = [];
      let size = 0;
      for (const item of this.history.slice(-12).reverse()) {
        const length = item.original.length + item.translation.length;
        if (size + length > 24000) break;
        history.unshift({ original: item.original, translation: item.translation }); size += length;
      }
      const result = await this.api.request('chat', { text, source, target: source === 'es' ? 'en' : 'es', history });
      result.sender = source === 'es' ? 'Participante 1 · Español' : 'Participant 2 · English';
      this.history.push(result); this.renderMessage(result);
      this.input.value = ''; this.input.dispatchEvent(new Event('input'));
      this.notify('Mensaje traducido. Puedes cambiar de participante para responder.');
    } catch (error) { this.notify(error.message, true); }
    finally { this.busy = false; this.lock(false); this.input.focus(); }
  }
  lock(busy) {
    this.form.querySelectorAll('button, textarea, select').forEach(x => x.disabled = busy);
    document.querySelector('#clearChat').disabled = busy;
    document.querySelector('#sendMessage').textContent = busy ? 'Traduciendo…' : 'Traducir ↗';
    document.querySelector('#chatLog').setAttribute('aria-busy', String(busy));
  }
  renderMessage(result) {
    document.querySelector('#welcome').hidden = true;
    const article = element('article', `message ${result.source === 'en' ? 'from-english' : ''}`);
    article.append(element('h3', 'sender', result.sender));
    const pair = element('div', 'translation-pair');
    for (const [label, text, lang] of [['Original', result.original, result.source], ['Traducción', result.translation, result.target]]) {
      const section = element('section', label === 'Traducción' ? 'translated' : 'original');
      section.append(element('h4', 'result-label', `${label} · ${lang === 'es' ? 'Español' : 'English'}`));
      const p = element('p', 'result-text', text); p.lang = lang; section.append(p); pair.append(section);
    }
    article.append(pair); document.querySelector('#chatLog').append(article);
    article.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.querySelector('#exportChat').disabled = false;
  }
  clear() {
    if (this.busy) return;
    this.history = []; document.querySelector('#chatLog').replaceChildren();
    document.querySelector('#welcome').hidden = false; document.querySelector('#exportChat').disabled = true;
    this.notify('Nueva conversación. Se eliminó el historial de esta pestaña.');
  }
}
