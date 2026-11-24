#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "==> [1/4] Installing lightweight CPU-only PyTorch..."
pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

echo "==> [2/4] Installing backend requirements..."
pip install --no-cache-dir -r requirements.txt

echo "==> [3/4] Downloading essential NLTK corpus datasets..."
python -c "import nltk; nltk.download('punkt', quiet=True); nltk.download('punkt_tab', quiet=True); nltk.download('stopwords', quiet=True); nltk.download('wordnet', quiet=True); nltk.download('averaged_perceptron_tagger', quiet=True); nltk.download('averaged_perceptron_tagger_eng', quiet=True)"

echo "==> [4/4] Initializing database and campus location datasets..."
python seed.py

echo "==> Render build successfully completed!"
