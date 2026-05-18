#!/bin/bash
set -e
echo "Setting up Lineage Platform..."
cd ../ai-infra && docker-compose up -d && sleep 10 && cd -
cd lineage-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/validate_connections.py
cd ../lineage-frontend && npm install && cp .env.example .env && cd -
echo "Setup complete!"
