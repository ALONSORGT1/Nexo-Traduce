"""Validate uploaded bytes before parsing; retain no files on disk."""
import io
import warnings
import zipfile
from pathlib import Path
from PIL import Image, UnidentifiedImageError
from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph
from pypdf import PdfReader
from backend.errors import AppError

MAX_FILE = 3 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 16_000_000


class UploadValidator:
    EXTENSIONS = {
        'documents': {'.pdf', '.docx', '.txt'},
        'audio': {'.mp3', '.mp4', '.m4a', '.wav', '.webm'},
        'images': {'.jpg', '.jpeg', '.png', '.webp'},
    }

    def read(self, upload, mode):
        if not upload or not upload.filename:
            raise AppError('Selecciona un archivo antes de traducir.')
        extension = Path(upload.filename).suffix.lower()
        if extension not in self.EXTENSIONS[mode]:
            raise AppError('Formato no admitido para esta modalidad.')
        data = upload.stream.read(MAX_FILE + 1)
        if not data:
            raise AppError('El archivo está vacío.')
        if len(data) > MAX_FILE:
            raise AppError('El archivo supera el límite de 3 MB.', 413)
        if mode == 'audio':
            valid = {
                '.mp3': data.startswith(b'ID3') or (len(data) > 2 and data[0] == 255 and data[1] & 224 == 224),
                '.wav': data.startswith(b'RIFF') and data[8:12] == b'WAVE',
                '.webm': data.startswith(b'\x1aE\xdf\xa3'),
                '.m4a': data[4:8] == b'ftyp',
                '.mp4': data[4:8] == b'ftyp',
            }[extension]
            if not valid:
                raise AppError('El contenido no corresponde al formato de audio seleccionado.')
        if mode == 'images':
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter('error', Image.DecompressionBombWarning)
                    with Image.open(io.BytesIO(data)) as image:
                        expected = {'.jpg': 'JPEG', '.jpeg': 'JPEG', '.png': 'PNG', '.webp': 'WEBP'}
                        if image.format != expected[extension] or getattr(image, 'is_animated', False):
                            raise AppError('Usa una imagen JPG, PNG o WebP estática con la extensión correcta.')
                        if image.width * image.height > 16_000_000:
                            raise AppError('La imagen supera los 16 megapíxeles.', 413)
                        image.verify()
            except AppError:
                raise
            except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
                raise AppError('No pudimos leer la imagen. Usa una imagen válida de hasta 16 megapíxeles.') from None
        return data, extension


class DocumentExtractor:
    MAX_CHARS = 24000

    def extract(self, data, extension):
        try:
            if extension == '.txt':
                content = data.decode('utf-8-sig')
                if '\x00' in content:
                    raise AppError('El TXT debe contener texto UTF-8, no datos binarios.')
                blocks = content.split('\n\n')
            elif extension == '.pdf':
                if not data.startswith(b'%PDF-'):
                    raise AppError('El archivo no es un PDF válido.')
                reader = PdfReader(io.BytesIO(data))
                if reader.is_encrypted:
                    raise AppError('El PDF está protegido. Carga una copia sin contraseña.')
                if len(reader.pages) > 30:
                    raise AppError('El PDF supera el límite de 30 páginas.', 413)
                blocks = []
                for page in reader.pages:
                    streams = page.get_contents()
                    if streams is not None and len(streams.get_data()) > 8 * 1024 * 1024:
                        raise AppError('Una página del PDF es demasiado compleja para procesarla.', 413)
                    text = page.extract_text() or ''
                    if not text.strip():
                        raise AppError('El PDF tiene páginas sin texto extraíble. Usa un PDF con texto o carga esas páginas como imágenes.')
                    blocks.append(text)
            else:
                with zipfile.ZipFile(io.BytesIO(data)) as archive:
                    if sum(x.file_size for x in archive.infolist()) > 20 * 1024 * 1024:
                        raise AppError('El documento descomprimido es demasiado grande.', 413)
                    if 'word/document.xml' not in archive.namelist():
                        raise AppError('El archivo no es un documento DOCX válido.')
                doc = Document(io.BytesIO(data))
                blocks = []
                for item in doc.iter_inner_content():
                    if isinstance(item, Paragraph):
                        blocks.append(item.text)
                    elif isinstance(item, Table):
                        blocks.extend(' | '.join(cell.text for cell in row.cells) for row in item.rows)
            blocks = [block.strip() for block in blocks if block.strip()]
            if not blocks:
                raise AppError('El documento no contiene texto procesable. Si es escaneado, usa Imágenes.')
            if sum(len(block) for block in blocks) > self.MAX_CHARS:
                raise AppError('El documento supera los 24 000 caracteres. Divídelo en partes.', 413)
            # Bound the number of API requests while preserving order and paragraph breaks.
            sections = []
            pending = ''
            for block in blocks:
                for offset in range(0, len(block), 5000):
                    part = block[offset:offset + 5000]
                    if pending and len(pending) + len(part) + 2 > 6000:
                        sections.append(pending); pending = ''
                    pending += ('\n\n' if pending else '') + part
            if pending:
                sections.append(pending)
            return sections
        except AppError:
            raise
        except UnicodeDecodeError:
            raise AppError('Guarda el archivo TXT con codificación UTF-8.') from None
        except Exception:
            raise AppError('No pudimos leer el documento. Comprueba que no esté dañado o protegido.') from None
