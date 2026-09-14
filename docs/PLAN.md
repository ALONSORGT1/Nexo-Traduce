# Nexo Traduce — plan de implementación

Autor: Alonso Ramírez G.

## Objetivo
Una plataforma Español ↔ Inglés con identidad visual de Nexo, accesible desde laptop, tableta y teléfono. HTML, CSS, JavaScript y Bootstrap; backend Python con OpenAI. Frontend en GitHub Pages y backend en Vercel.

## Bloques y entregables
1. Estructura, arquitectura POO, variables privadas, límites y contrato HTTP.
2. Interfaz Nexo y chat entre dos participantes, originales y traducciones visibles, historial en memoria.
3. Audio cargado/grabado, transcripción, traducción y voz; PDF, DOCX y TXT por secciones.
4. Visión: extracción y traducción; edición opcional de imagen y comparación descargable.
5. Pruebas de contratos/errores, revisión responsive, documentación y despliegue.

## Arquitectura
`TranslationService` coordina OpenAI; `DocumentExtractor` interpreta documentos; `UploadValidator` comprueba entradas; `create_app` expone rutas y controla seguridad. En el navegador, `ApiClient`, `ChatController` y `FileController` separan transporte, conversación y archivos.

## Decisiones
- Una sola modalidad visible; navegación lateral en escritorio y horizontal en móvil.
- Traducción de mensajes en ambos sentidos dentro del mismo historial. Dos participantes locales, no mensajería remota multiusuario.
- Archivos en memoria; sin base de datos ni archivos del usuario en el repositorio.
- Máximo 3 MB por archivo y 4 MB por petición; imágenes hasta 16 megapíxeles.
- Documentos hasta 30 páginas / 24 000 caracteres. PDF escaneado requiere la modalidad de imágenes.
- La edición de imágenes usa la imagen original como referencia; no promete identidad de píxeles.
- CORS no equivale a autenticación. Código de acceso opcional y límites de gasto recomendados para publicación.
- Pruebas automatizadas con dobles de OpenAI comprueban contratos, no calidad de traducción. Las pruebas reales se reportarán por separado.

## Estado de implementación
Los cinco bloques de código están implementados y versionados. Pruebas automatizadas y llamadas reales a OpenAI aprobadas; resultados en `VALIDACION.md`.

La configuración privada fue reutilizada desde el origen empleado por Identificación de Patrones, con autorización del propietario. GitHub Pages publicado y backend Flask desplegado en Vercel. El propietario completó la verificación de GitHub y habilitó el repositorio en la integración. El frontend apunta al backend público y conserva el servidor local para desarrollo.
