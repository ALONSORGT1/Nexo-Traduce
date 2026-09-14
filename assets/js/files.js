import { element, download } from './api.js';

const MODES = {
  audio: { title: 'Dale voz a tus ideas.', description: 'Sube una grabación o habla desde aquí. Lee lo que dijiste y escucha tu mensaje en el otro idioma.', formats: 'MP3, MP4, M4A, WAV o WebM · hasta 3 MB', accept: '.mp3,.mp4,.m4a,.wav,.webm', hint: 'Graba hasta 60 segundos. La traducción se reproduce con una voz de IA.' },
  documents: { title: 'Cada página, más cerca.', description: 'Traduce documentos conservando el orden de sus ideas. Compara el texto original y la traducción, sección por sección.', formats: 'PDF, Word (.docx) o TXT UTF-8 · hasta 3 MB', accept: '.pdf,.docx,.txt', hint: 'Hasta 30 páginas de PDF y 24 000 caracteres. Los PDF escaneados se trabajan como imágenes.' },
  images: { title: 'Mira más allá del idioma.', description: 'Un aviso, un menú, una fotografía. Comprende su texto y crea una versión de la imagen en el otro idioma.', formats: 'JPG, PNG o WebP · hasta 3 MB y 16 megapíxeles', accept: '.jpg,.jpeg,.png,.webp', hint: 'Usa una imagen nítida. Podrás comparar el original y la versión traducida.' },
};

export class FileController {
  constructor(api, notify) {
    this.api = api; this.notify = notify; this.mode = 'audio'; this.file = null;
    this.busy = false; this.results = []; this.objectUrl = null; this.recorder = null;
    this.recording = false; this.states = {}; this.speechText = '';
    document.querySelector('#fileForm').addEventListener('submit', event => { event.preventDefault(); this.translate(); });
    document.querySelector('#fileInput').addEventListener('change', event => this.select(event.target.files[0]));
    document.querySelector('#removeFile').addEventListener('click', () => this.select(null));
    document.querySelector('#sourceLanguage').addEventListener('change', () => this.direction());
    document.querySelector('#swapLanguages').addEventListener('click', () => {
      const select = document.querySelector('#sourceLanguage'); select.value = select.value === 'es' ? 'en' : 'es'; this.direction();
    });
    const zone = document.querySelector('#dropzone');
    ['dragenter', 'dragover'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.add('dragging'); }));
    ['dragleave', 'drop'].forEach(name => zone.addEventListener(name, event => { event.preventDefault(); zone.classList.remove('dragging'); }));
    zone.addEventListener('drop', event => { if (!this.busy && !this.recording) this.select(event.dataTransfer.files[0]); });
    document.querySelector('#recordButton').addEventListener('click', () => this.record());
    document.querySelector('#downloadResult').addEventListener('click', () => download(this.results.map((x, i) =>
      `Sección ${i + 1}\nOriginal (${x.source}):\n${x.original}\n\nTraducción (${x.target}):\n${x.translation}`).join('\n\n———\n\n'), 'nexo-traduccion.txt'));
    document.querySelector('#retrySpeech').addEventListener('click', () => this.generateSpeech());
    document.querySelector('#editImage').addEventListener('click', () => this.editImage());
    window.addEventListener('pagehide', () => { this.stopRecording(); this.releaseUrl(); });
  }
  setMode(mode) {
    if (this.busy || this.recording) { this.notify('Espera a que termine la operación actual.', true); return false; }
    this.mode = mode;
    const config = MODES[mode];
    document.querySelector('#fileTitle').textContent = config.title;
    document.querySelector('#fileDescription').textContent = config.description;
    document.querySelector('#fileFormats').textContent = config.formats;
    document.querySelector('#fileInput').accept = config.accept;
    document.querySelector('#fileHint').textContent = config.hint;
    document.querySelector('#audioTools').hidden = mode !== 'audio';
    document.querySelector('#imageOptions').hidden = mode !== 'images';
    this.select(null); return true;
  }
  direction() {
    document.querySelector('#targetLanguage').textContent = document.querySelector('#sourceLanguage').value === 'es' ? 'English' : 'Español';
  }
  languages() { const source = document.querySelector('#sourceLanguage').value; return { source, target: source === 'es' ? 'en' : 'es' }; }
  releaseUrl() { if (this.objectUrl) URL.revokeObjectURL(this.objectUrl); this.objectUrl = null; }
  select(file) {
    if (this.busy || this.recording) return;
    if (file) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!MODES[this.mode].accept.split(',').includes(ext)) { this.notify('Formato no admitido. ' + MODES[this.mode].formats, true); document.querySelector('#fileInput').value = ''; return; }
      if (!file.size || file.size > 3 * 1024 * 1024) { this.notify(file.size ? 'El archivo supera los 3 MB.' : 'El archivo está vacío.', true); document.querySelector('#fileInput').value = ''; return; }
    }
    this.releaseUrl(); this.file = file || null; this.results = []; this.speechText = '';
    document.querySelector('#fileResult').hidden = true; document.querySelector('#selectedFile').hidden = !file;
    document.querySelector('#sourceAudio').hidden = true; document.querySelector('#sourceAudio').pause();
    document.querySelector('#sourceAudio').removeAttribute('src');
    document.querySelector('#translatedAudio').pause(); document.querySelector('#translatedAudio').removeAttribute('src');
    document.querySelector('#editedFigure').hidden = true; document.querySelector('#downloadImage').hidden = true;
    document.querySelector('#editedImage').removeAttribute('src'); document.querySelector('#originalImage').removeAttribute('src');
    document.querySelector('#downloadImage').removeAttribute('href');
    if (!file) { document.querySelector('#fileInput').value = ''; return; }
    document.querySelector('#fileName').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    this.objectUrl = URL.createObjectURL(file);
    if (this.mode === 'audio') { document.querySelector('#sourceAudio').src = this.objectUrl; document.querySelector('#sourceAudio').hidden = false; }
    this.notify('Archivo listo para traducir.');
  }
  lock(busy) {
    this.busy = busy;
    document.querySelectorAll('#fileForm button, #fileForm input, #sourceLanguage, #swapLanguages, #editImage, #retrySpeech').forEach(x => x.disabled = busy);
    document.querySelector('#fileProgress').hidden = !busy;
    document.querySelector('#filePanel').setAttribute('aria-busy', String(busy));
  }
  progress(text) { document.querySelector('#progressText').textContent = text; this.notify(text); }
  async translate() {
    if (this.busy || this.recording) return;
    if (!this.file) return this.notify('Selecciona un archivo antes de traducir.', true);
    this.lock(true); this.progress('Enviando y procesando el archivo…');
    document.querySelector('#fileResult').hidden = true;
    const langs = this.languages();
    try {
      let result;
      if (this.mode === 'audio') {
        this.progress('Transcribiendo el audio…');
        const transcript = await this.api.request('transcribe', langs, this.file);
        this.progress('Traduciendo la transcripción…');
        result = await this.api.request('translate', { ...langs, text: transcript.original });
      } else result = await this.api.request(this.mode, langs, this.file);
      this.results = result.sections || [result]; this.render();
      if (this.mode === 'audio') { this.speechText = result.translation; await this.speech(); }
      else this.notify('Traducción lista. Revisa el original y el resultado.');
    } catch (error) { this.notify(error.message, true); }
    finally { this.lock(false); }
  }
  render() {
    const host = document.querySelector('#resultContent'); host.replaceChildren();
    this.results.forEach((result, index) => {
      const block = element('article', 'document-section');
      if (this.results.length > 1) block.append(element('h3', '', `Sección ${index + 1}`));
      const pair = element('div', 'translation-pair');
      [['Original', result.original, result.source], ['Traducción', result.translation, result.target]].forEach(([label, text, lang]) => {
        const side = element('section', label === 'Traducción' ? 'translated' : 'original');
        side.append(element('h4', 'result-label', `${label} · ${lang === 'es' ? 'Español' : 'English'}`));
        const p = element('p', 'result-text', text); p.lang = lang; side.append(p); pair.append(side);
      });
      block.append(pair); host.append(block);
      if (result.warning) host.append(element('p', 'small-note', result.warning));
    });
    document.querySelector('#fileResult').hidden = false;
    document.querySelector('#speechResult').hidden = this.mode !== 'audio';
    document.querySelector('#imageComparison').hidden = this.mode !== 'images';
    if (this.mode === 'images') document.querySelector('#originalImage').src = this.objectUrl;
    document.querySelector('#fileResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  async speech() {
    document.querySelector('#translatedAudio').hidden = true; document.querySelector('#retrySpeech').hidden = true;
    this.progress('Generando la traducción hablada…');
    try {
      const result = await this.api.request('speech', { text: this.speechText });
      document.querySelector('#translatedAudio').src = result.audio;
      document.querySelector('#translatedAudio').hidden = false;
      this.notify('Traducción lista. Pulsa reproducir para escucharla.');
    } catch (error) {
      document.querySelector('#retrySpeech').hidden = false;
      this.notify('La traducción está lista, pero no se pudo generar la voz. ' + error.message, true);
    }
  }
  async generateSpeech() { if (this.busy) return; this.lock(true); try { await this.speech(); } finally { this.lock(false); } }
  stopRecording() {
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.stream?.getTracks().forEach(track => track.stop());
    clearInterval(this.recordTimer);
  }
  async record() {
    if (this.busy) return;
    if (this.recording) { this.stopRecording(); return; }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) return this.notify('La grabación requiere HTTPS y un navegador compatible. Puedes subir un audio.', true);
    const button = document.querySelector('#recordButton');
    button.disabled = true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ['audio/webm;codecs=opus', 'audio/mp4'].find(x => MediaRecorder.isTypeSupported(x));
      if (!type) { this.stream.getTracks().forEach(x => x.stop()); throw new Error('Tu navegador no puede grabar un formato admitido. Sube un archivo de audio.'); }
      this.recorder = new MediaRecorder(this.stream, { mimeType: type, audioBitsPerSecond: 64000 });
      const chunks = []; let bytes = 0;
      this.recorder.ondataavailable = event => { if (event.data.size) { chunks.push(event.data); bytes += event.data.size; if (bytes > 2.8 * 1024 * 1024) this.stopRecording(); } };
      this.recorder.onstop = () => {
        this.stream.getTracks().forEach(track => track.stop()); clearInterval(this.recordTimer); this.recording = false;
        button.textContent = '● Grabar audio';
        document.querySelectorAll('#fileInput, #translateFile, #removeFile').forEach(x => x.disabled = false);
        document.querySelector('#recordStatus').textContent = '';
        this.select(new File(chunks, type.startsWith('audio/mp4') ? 'grabacion.m4a' : 'grabacion.webm', { type }));
      };
      this.recorder.onerror = () => { this.stopRecording(); this.notify('Se interrumpió la grabación. Inténtalo de nuevo.', true); };
      this.recording = true; this.recorder.start(500); button.textContent = '■ Detener grabación';
      document.querySelectorAll('#fileInput, #translateFile, #removeFile').forEach(x => x.disabled = true);
      let seconds = 0; document.querySelector('#recordStatus').textContent = 'Grabando · 0 / 60 s';
      this.recordTimer = setInterval(() => { seconds++; document.querySelector('#recordStatus').textContent = `Grabando · ${seconds} / 60 s`; if (seconds >= 60) this.stopRecording(); }, 1000);
    } catch (error) { this.notify(error.name === 'NotAllowedError' ? 'No se permitió el micrófono. Habilítalo o sube un audio.' : error.message, true); }
    finally { button.disabled = false; }
  }
  async editImage() { this.notify('La edición visual se está preparando.'); }
}
