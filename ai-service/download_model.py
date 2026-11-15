"""Télécharge une fois le modèle sémantique (~470 Mo) dans le cache local.
Usage : python download_model.py"""
import os
from sentence_transformers import SentenceTransformer

from matcher.semantic import DEFAULT_MODEL

name = os.getenv("CV_AI_MODEL", DEFAULT_MODEL)
SentenceTransformer(name)
print(f"Modèle prêt : {name}")
