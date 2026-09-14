"""Vercel WSGI entry point."""
from backend.app import create_app

app = create_app()
