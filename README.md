# Nexo Traduce

**Entendernos nos acerca.** Traductor multimodal Español ↔ Inglés desarrollado por **Alonso Ramírez G.**, para Inteligencia Artificial aplicada a las TIC, ITP.

Permite que personas de México y Estados Unidos compartan mensajes, voz, documentos e imágenes en una plataforma. Conserva la identidad visual y el modo oscuro de Nexo / Nexo Visión.

## Acceso

- Repositorio: https://github.com/ALONSORGT1/Nexo-Traduce
- Frontend publicado: https://alonsorgt1.github.io/Nexo-Traduce/ (backend público pendiente de conectar).
- Backend: publicación en Vercel en preparación.

## Funciones

- **Conversación:** dos participantes locales alternan español e inglés. Cada mensaje incluye autor, original y traducción. Historial durante la sesión y descarga TXT.
- **Audio:** carga un archivo o graba hasta 60 segundos. Transcripción, traducción y reproducción con voz generada por IA. Si falla la voz, el texto permanece y se permite reintentar solo la voz.
- **Documentos:** PDF con texto, Word DOCX y TXT UTF-8. Lectura en orden, incluyendo tablas sencillas de Word; traducción y comparación por secciones; descarga de texto.
- **Imágenes:** lectura visual de texto, traducción y advertencias de legibilidad. Edición opcional de la imagen de referencia para sustituir el texto; comparación y descarga JPG.
- **Interfaz:** HTML/CSS/JavaScript y Bootstrap 5.3.8 local, navegación lateral en escritorio y horizontal en móvil, tema claro/oscuro, mensajes de estado y accesibilidad por teclado.

## Ejecutar en tu equipo

Requiere Python 3.12 o superior.

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
Copy-Item .env.example .env.local
# Edita .env.local y configura OPENAI_API_KEY solo en ese archivo privado.
.\.venv\Scripts\python scripts/serve.py
```

Abre http://localhost:5500. Este servidor entrega únicamente `index.html`, `assets/` y la API; no expone la carpeta de trabajo. No uses un servidor estático abierto en la raíz del proyecto, porque allí puede existir `.env.local`.

La clave del entorno local se toma de la configuración privada autorizada por el propietario. No forma parte del repositorio. No vuelvas a copiar `.env.example` sobre una configuración privada existente.

## Arquitectura y POO

```text
Navegador (GitHub Pages)
  ApiClient → backend Python (Vercel / Flask)
  ChatController / FileController
                   ↓
  UploadValidator / DocumentExtractor / TranslationService
                   ↓
             API de OpenAI
```

| Componente | Responsabilidad |
|---|---|
| `ApiClient` | HTTP, archivos multipart, código de acceso, errores y timeout. |
| `ChatController` | Conversación, participantes, contexto acotado y exportación. |
| `FileController` | Archivos, micrófono, estados de procesamiento, comparación y descargas. |
| `TranslationService` | Encapsula el cliente privado de OpenAI; traducción, voz, visión y edición. |
| `UploadValidator` | Tamaño, extensión y validación de bytes; imágenes estáticas y megapíxeles. |
| `DocumentExtractor` | Extrae y agrupa texto sin mezclar responsabilidades con la IA. |
| `MemoryRequest` | Mantiene las cargas multipart en memoria, sin archivos temporales persistentes. |
| `AppError` | Errores controlados con mensajes seguros y estados HTTP. |

Las clases permiten reemplazar el servicio durante pruebas y reutilizar traducción entre modalidades. El servidor valida las entradas antes de invocar a OpenAI. La UI muestra texto mediante `textContent`, sin ejecutar HTML de usuarios ni respuestas.

## Uso de OpenAI

| Variable / modelo predeterminado | Uso y elección |
|---|---|
| `OPENAI_MODEL=gpt-4.1-mini` | Responses API para traducción textual y visión; admite imágenes y salida estructurada, con bajo costo relativo para este alcance. |
| `OPENAI_TRANSCRIBE_MODEL=gpt-4o-mini-transcribe` | Transcribe voz al idioma original. Después se traduce por separado para admitir ambos sentidos. |
| `OPENAI_SPEECH_MODEL=gpt-4o-mini-tts` | Produce MP3 en el idioma de la traducción. Voz `coral`; la interfaz identifica el audio sintético. |
| `OPENAI_IMAGE_MODEL=gpt-image-1.5` | Images Edits con la imagen original como referencia y el texto traducido. La generación es opcional y consume una llamada adicional. |

Los modelos son configurables en el backend. La cuenta debe tener acceso y saldo. No hay traducciones fijas ni un modo simulado dentro de la aplicación. Los prompts ordenan conservar nombres, cifras y estructura, y tratar el contenido como datos que se traducen, no como instrucciones para ejecutar.

Referencias oficiales: [Responses](https://developers.openai.com/api/docs/guides/text), [visión](https://developers.openai.com/api/docs/guides/images-vision), [transcripción](https://developers.openai.com/api/docs/guides/speech-to-text), [voz](https://developers.openai.com/api/docs/guides/text-to-speech), [edición de imágenes](https://developers.openai.com/api/docs/guides/image-generation).

## Formatos y límites

| Entrada | Formatos | Límite |
|---|---|---|
| Chat | Texto | 6 000 caracteres por mensaje; contexto reciente hasta 12 mensajes / 24 000 caracteres. |
| Audio | MP3, MP4/M4A, WAV, WebM | 3 MB; grabación integrada de 60 s; transcripción hasta 12 000 caracteres. |
| Documentos | PDF, DOCX, TXT UTF-8 | 3 MB, 24 000 caracteres; PDF hasta 30 páginas. |
| Imágenes | JPG/JPEG, PNG, WebP estático | 3 MB, 16 megapíxeles; copia enviada hasta 2048 px de lado mayor. |
| Petición HTTP | JSON o multipart | 4 MB incluyendo el envoltorio. |

Los MP4/M4A deben contener voz. La cabecera se valida localmente y OpenAI valida/decodifica el audio. No se admite Word antiguo `.doc`, SVG, GIF, archivos animados ni PDF protegido. Un PDF con páginas sin texto extraíble se rechaza explícitamente para evitar omisiones silenciosas; se pueden cargar esas páginas como imágenes.

## Seguridad y privacidad

- `OPENAI_API_KEY` permanece en el backend. `.env*`, `.venv`, temporales y credenciales están excluidos de Git y del despliegue.
- `ALLOWED_ORIGINS` es una lista exacta separada por comas. CORS no usa `*`; las solicitudes con origen no autorizado se rechazan. Las solicitudes sin Origin pueden provenir de clientes HTTP legítimos: **CORS no autentica usuarios ni impide abuso externo**.
- `APP_ACCESS_CODE` permite exigir un código compartido en cada POST. En el navegador se introduce en **Conexión** y permanece en memoria. No es una clave de OpenAI. No equivale a cuentas individuales ni a cuotas distribuidas.
- Esta entrega educativa no incluye limitador distribuido ni facturación por usuario. Para exposición amplia, configura código de acceso, límites de gasto de OpenAI, reglas de Vercel Firewall y/o autenticación con cuotas. No confundas ocultar la clave con proteger por completo el servicio.
- Los archivos se procesan en memoria y no se guardan en una base de datos. Historial y resultados permanecen en la pestaña; al recargar se eliminan. Cambiar de modalidad de archivos inicia una nueva carga; el chat conserva su historial.
- Las llamadas Responses llevan `store=False`. Los archivos se envían a OpenAI; esto no elimina las políticas de retención del proveedor. Evita documentos personales o información sensible.
- Errores de conexión, autorización, cuota, formato y respuestas incompletas se presentan sin trazas ni credenciales.

## Publicar

1. Crea un repositorio y sube la rama `main`. El historial debe conservar los commits progresivos.
2. Importa el repositorio en Vercel. `app.py` expone Flask y `vercel.json` selecciona el preset Flask: la aplicación controla todas las rutas y sirve solo el HTML y los assets autorizados. `.python-version` fija Python 3.12. No se requiere comando de compilación. Referencia: [Python en Vercel](https://vercel.com/docs/functions/runtimes/python).
3. En Vercel configura `OPENAI_API_KEY` y `ALLOWED_ORIGINS=https://alonsorgt1.github.io,https://TU-BACKEND.vercel.app`. Añade localhost si se necesita. Configura opcionalmente `APP_ACCESS_CODE`.
4. Escribe la URL pública del backend en `assets/js/config.js`; nunca escribas claves allí. Para pruebas se puede cambiar la dirección temporalmente desde **Conexión**.
5. En GitHub → Settings → Pages elige GitHub Actions. `.github/workflows/pages.yml` ejecuta pruebas y publica exclusivamente `index.html` y `assets/`.
6. Comprueba desde Pages chat, audio, documentos e imágenes. El origen permitido es el dominio, sin ruta de repositorio.

`scripts/publish_github.py` crea el repositorio de entrega usando la sesión existente de Git Credential Manager, sin mostrar ni guardar el token.

## API

| Ruta | Entrada | Respuesta |
|---|---|---|
| `GET /api/health` | — | Disponibilidad de configuración y necesidad de código; no consume OpenAI. |
| `POST /api/chat` | JSON: text, source, target, history opcional | original, translation, source, target |
| `POST /api/translate` | JSON: text, source, target | Traducción textual (hasta 12 000 caracteres). |
| `POST /api/transcribe` | multipart: file, source, target | Transcripción original. |
| `POST /api/speech` | JSON: text | Audio MP3 como data URL. |
| `POST /api/documents` | multipart: file, source, target | sections: pares original/traducción. |
| `POST /api/images` | multipart: file, source, target | original, translation, warning, readable. |
| `POST /api/image-edit` | multipart: file, source, target, original, translation | JPG editado como data URL. |

`source` y `target` deben ser `es/en` o `en/es`. Los errores devuelven `{ "error": "mensaje" }` y un estado HTTP apropiado.

## Pruebas

```powershell
.\.venv\Scripts\python -m unittest discover -s tests -v
node --check assets/js/app.js
node --check assets/js/files.js
node --check assets/js/chat.js
```

La suite usa un servicio simulado solo en pruebas. Valida contratos, documentos generados en memoria, CORS, acceso, entradas vacías, archivos falsos, tamaño, respuesta incompleta y errores seguros. Las pruebas reales y revisión visual se documentan en `docs/VALIDACION.md`.

## Limitaciones

- Chat para dos participantes en un mismo navegador, sin salas remotas ni sincronización entre dispositivos.
- La dirección es explícita: el usuario indica el idioma. No hay detector independiente garantizado. La visión puede advertir discrepancias; traducción textual maneja texto ya traducido o fuera del par de idiomas según el prompt.
- OCR, transcripción y traducción pueden equivocarse; especialmente con texto borroso, ruido, silencio, nombres y tablas complejas. No se garantiza detectar todos los casos de audio sin voz.
- DOCX extrae cuerpo, párrafos y tablas sencillas; no encabezados/pies, comentarios, notas, cuadros de texto ni imágenes incrustadas. PDF extrae texto y su orden puede diferir en diseños con varias columnas.
- Los documentos se exportan como TXT comparativo; no se reconstruye su maquetación. Se dividen en secciones para acotar las llamadas.
- La imagen editada **no es idéntica píxel a píxel**: la IA puede cambiar tipografía, composición y detalles. Revisa el original y la traducción visual.
- Generar voz e imágenes consume llamadas adicionales. El navegador espera hasta 285 s por petición; la función dispone de hasta 300 s según el entorno/plan de Vercel. Un timeout o cerrar la pestaña no garantiza cancelar el procesamiento del proveedor.
- El micrófono requiere HTTPS o localhost y compatibilidad con MediaRecorder. Se mantiene la opción de cargar archivos.

Bootstrap se distribuye bajo licencia MIT; su cabecera de licencia se conserva en el archivo local.
