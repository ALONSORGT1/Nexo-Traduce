# Validación de Nexo Traduce

Fecha: 14 de septiembre de 2026.

## Automatizada

19 pruebas unitarias y HTTP aprobadas localmente y en GitHub Actions (Python 3.12 en CI). Se verificaron conversación bidireccional, validación de contexto, CORS y preflight, código de acceso, rutas privadas, PDF con texto, DOCX con párrafos y tablas, TXT, archivos falsos/vacíos/grandes, PDF sin texto, errores seguros, respuestas incompletas, salida estructurada de visión, voz y contrato de edición. Estas pruebas utilizan dobles del proveedor y no pretenden medir la calidad lingüística.

Los módulos JavaScript pasan la comprobación de sintaxis. El escaneo de archivos rastreados no encontró patrones de API keys; `.env.local` está excluido mediante `.gitignore`.

## Pruebas reales de OpenAI

Todas las siguientes operaciones respondieron HTTP 200 usando la configuración privada autorizada, desde la aplicación Flask:

| Escenario | Resultado observado |
|---|---|
| Español → Inglés | «La reunión será mañana a las 10:30 en la sala B. Trae 3 documentos.» → «The meeting will be tomorrow at 10:30 in room B. Bring 3 documents.» |
| Inglés → Español | «Please send the revised document by Friday, September 18.» → «Por favor, envíe el documento revisado antes del viernes 18 de septiembre.» |
| TXT | Título, párrafo y sección de acuerdos procesados. |
| PDF | Texto extraído de un PDF sintético y traducido. |
| DOCX | Agenda y acuerdos con títulos y párrafos procesados. |
| Voz | MP3 generado a partir de una frase española; transcripción recuperada y traducida al inglés. |
| Visión | Aviso sintético «BIENVENIDOS / Horario: 9:00 a 18:00» leído y traducido como «WELCOME / Schedule: 9:00 to 18:00». |
| Edición visual | JPG generado con el marco y los colores generales conservados y el texto traducido. Inspeccionado visualmente; no representa garantía de identidad visual en otros casos. |

Los archivos de prueba reales están en `tmp/`, fuera del repositorio. No se usaron documentos personales. Las comprobaciones son una muestra funcional; no sustituyen una evaluación lingüística amplia ni prueban precisión con cualquier ruido, tipografía o documento.

## Navegador

- Chat probado con envío real desde la UI; original y traducción visibles.
- Audio cargado desde la UI; transcripción, traducción y controles de reproducción de ambos audios visibles.
- Revisión visual de escritorio 1280 × 720, tableta 768 × 1024 y teléfono 390 × 844.
- En teléfono, ancho del documento de 390 px sobre viewport de 390 px: sin desbordamiento horizontal; botón de envío dentro de pantalla.
- La grabación física del micrófono no se probó para evitar capturar conversaciones del entorno. El flujo de audio sí se validó con archivo sintético real.

## Publicación

Repositorio creado y commits progresivos subidos. GitHub Pages configurado para GitHub Actions. La primera ejecución de publicación se inició antes de habilitar Pages; pruebas aprobadas, configuración de Pages fallida. Se vuelve a publicar con el siguiente commit una vez habilitado Pages.

Vercel exige conceder a su integración existente acceso al repositorio nuevo. GitHub solicita verificación de identidad del propietario para ese cambio; pendiente de completar por el propietario. Hasta conectar y desplegar el backend, la aplicación funciona localmente con `scripts/serve.py`.
