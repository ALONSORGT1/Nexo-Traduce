"""Local frontend + API, served from an explicit static file allowlist."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / '.env.local')
load_dotenv(ROOT / '.env')
from backend.app import create_app

if __name__ == '__main__':
    create_app().run(host='127.0.0.1', port=5500, debug=False)
