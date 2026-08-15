# 📋 Rules

This file documents all the specific rules and conventions we establish while working on the SIH 2026 hackathon project. 

## General Guidelines
- Prioritize clean and readable code over clever hacks.
- Always follow established architectural patterns.

## Formatting & Style
*To be populated.*

## Security & Privacy (Mandatory)
- **NO PERSONAL OR SENSITIVE DATA IN PUBLIC REPO:** Never commit or push any personal information, API keys, personal access tokens (PATs), credentials, secrets, passwords, `.env` files, or private contact details to the public Git repository.
- Always use environment variables (`.env`) for keys and ensure `.env*` is in `.gitignore`.

## Repository Management
- **Only Push Required Code & Assets:** Keep the public repository lean and clean.
  - Track: Source code, documentation, architecture diagrams, build scripts, and structured processed database/JSON datasets.
  - Do NOT track: Heavy raw PDF files, raw HTML dumps, temporary test scratch scripts, OS artifacts, or non-essential administrative notice PDFs (e.g., SIH notices).
  - Heavy raw datasets should be generated/downloaded on-demand via reproducible scripts (`data/download_*.py`, `data/build_master_database.py`).

## Workflow
- Always update `agent/memory.md`, `agent/tasks.md`, `agent/architecture.md`, and any other documentation files as soon as new decisions, requirements, or progress dictate they need an update. Ensure all project context remains current.

