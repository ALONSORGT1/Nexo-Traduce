"""Create the delivery repository and configure Pages using Git Credential Manager.

Run only when publishing is intended. Credentials stay in memory and are never logged.
"""
import json
import os
import subprocess
import urllib.error
import urllib.request

OWNER = 'ALONSORGT1'
REPO = 'Nexo-Traduce'


def request(path, data=None, method=None):
    result = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n',
        text=True, capture_output=True, env={**os.environ, 'GIT_TERMINAL_PROMPT': '0', 'GCM_INTERACTIVE': 'never'})
    credentials = dict(line.split('=', 1) for line in result.stdout.splitlines() if '=' in line)
    if not credentials.get('password'):
        raise RuntimeError('Inicia sesión en GitHub con Git Credential Manager antes de publicar.')
    headers = {'Authorization': 'Bearer ' + credentials['password'], 'User-Agent': 'Nexo-Traduce', 'Accept': 'application/vnd.github+json'}
    req = urllib.request.Request('https://api.github.com' + path, headers=headers,
        data=json.dumps(data).encode() if data is not None else None, method=method)
    with urllib.request.urlopen(req, timeout=30) as response:
        raw = response.read()
        return json.loads(raw) if raw else {}


if __name__ == '__main__':
    try:
        repo = request(f'/repos/{OWNER}/{REPO}')
    except urllib.error.HTTPError as exc:
        if exc.code != 404: raise SystemExit(f'GitHub rechazó la solicitud: HTTP {exc.code}')
        repo = request('/user/repos', {'name': REPO, 'private': False,
            'description': 'Nexo Traduce: traducción multimodal Español ↔ Inglés con OpenAI, Python y una interfaz responsive.'})
    print('Repositorio:', repo['html_url'])
