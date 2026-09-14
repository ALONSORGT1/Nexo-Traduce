import hmac
import os
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
from werkzeug.exceptions import HTTPException
from openai import APIError, APIConnectionError, APITimeoutError, AuthenticationError, RateLimitError
from backend.errors import AppError
from backend.services import TranslationService

ROOT = Path(__file__).resolve().parents[1]


def languages(data):
    source, target = data.get('source'), data.get('target')
    if (source, target) not in [('es', 'en'), ('en', 'es')]:
        raise AppError('Selecciona español → inglés o inglés → español.')
    return source, target


def text_input(data, maximum=6000):
    value = data.get('text')
    if not isinstance(value, str) or not value.strip():
        raise AppError('Escribe un mensaje antes de traducir.')
    if len(value) > maximum:
        raise AppError(f'El texto supera el límite de {maximum} caracteres.', 413)
    return value.strip()


def create_app(service=None):
    app = Flask(__name__, static_folder=None)
    app.config['MAX_CONTENT_LENGTH'] = 4 * 1024 * 1024
    translator = service or TranslationService()

    @app.before_request
    def protect():
        if not request.path.startswith('/api/'):
            return None
        allowed = {x.strip().rstrip('/') for x in os.getenv('ALLOWED_ORIGINS',
                   'http://localhost:5500,http://127.0.0.1:5500').split(',') if x.strip()}
        origin = request.headers.get('Origin')
        if origin and origin not in allowed:
            raise AppError('Este origen no tiene acceso al servicio.', 403)
        if request.method == 'OPTIONS':
            return '', 204
        if request.method == 'POST':
            code = os.getenv('APP_ACCESS_CODE', '')
            provided = request.headers.get('X-Access-Code', '')
            if code and not hmac.compare_digest(code.encode(), provided.encode()):
                raise AppError('El código de acceso no es válido. Revísalo en Conexión.', 401)

    @app.after_request
    def headers(response):
        origin = request.headers.get('Origin')
        allowed = {x.strip().rstrip('/') for x in os.getenv('ALLOWED_ORIGINS',
                   'http://localhost:5500,http://127.0.0.1:5500').split(',') if x.strip()}
        if origin in allowed:
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Vary'] = 'Origin'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, X-Access-Code'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        return response

    @app.errorhandler(Exception)
    def error(exc):
        if isinstance(exc, AppError):
            return jsonify(error=str(exc)), exc.status
        if isinstance(exc, HTTPException):
            messages = {413: 'La petición supera el límite de 4 MB.', 400: 'La solicitud no es válida.',
                        415: 'Envía el contenido en el formato solicitado.', 404: 'Ruta no encontrada.',
                        405: 'Método no permitido.'}
            return jsonify(error=messages.get(exc.code, 'Solicitud no válida.')), exc.code
        if isinstance(exc, RateLimitError):
            return jsonify(error='Se alcanzó el límite de OpenAI o el saldo disponible. Inténtalo más tarde.'), 429
        if isinstance(exc, AuthenticationError):
            return jsonify(error='El servidor no pudo autenticarse con OpenAI. Contacta al administrador.'), 503
        if isinstance(exc, (APITimeoutError, APIConnectionError)):
            return jsonify(error='No se pudo completar la conexión con OpenAI. Inténtalo de nuevo.'), 504
        if isinstance(exc, APIError):
            return jsonify(error='OpenAI no pudo procesar la solicitud. Revisa el archivo o intenta más tarde.'), 502
        app.logger.error('Request failed: %s', type(exc).__name__)
        return jsonify(error='No pudimos completar la operación. Inténtalo de nuevo.'), 500

    @app.get('/api/health')
    def health():
        return jsonify(ready=bool(os.getenv('OPENAI_API_KEY')), access_required=bool(os.getenv('APP_ACCESS_CODE')))

    @app.post('/api/chat')
    def chat():
        data = request.get_json()
        if not isinstance(data, dict):
            raise AppError('La solicitud debe ser un objeto JSON.')
        source, target = languages(data)
        text = text_input(data)
        history = data.get('history', [])
        if not isinstance(history, list) or len(history) > 12:
            raise AppError('El contexto de conversación no es válido.')
        clean = []
        for item in history:
            if not isinstance(item, dict) or any(not isinstance(item.get(k), str) or len(item[k]) > 12000
                                                 for k in ('original', 'translation')):
                raise AppError('El contexto de conversación no es válido.')
            clean.append({k: item[k] for k in ('original', 'translation')})
        if sum(len(x['original']) + len(x['translation']) for x in clean) > 24000:
            raise AppError('El contexto de conversación es demasiado largo.', 413)
        return jsonify(translator.translate(text, source, target, clean))

    @app.get('/')
    def home():
        return send_from_directory(ROOT, 'index.html')

    @app.get('/assets/<path:name>')
    def assets(name):
        return send_from_directory(ROOT / 'assets', name)

    return app
