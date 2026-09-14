"""Vercel Flask entry point; routes and static allowlist live in backend.app."""
from backend.app import create_app

app = create_app()
