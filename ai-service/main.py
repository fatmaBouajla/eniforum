"""
Microservice IA de matching de CV — Forum ENICarthage.

Contrat utilisé par le backend Spring Boot (inchangé) :
    POST /analyze  (multipart : file, poste_vise, contexte)
    ->  {"score": float, "justification": str, "competences": [str], "details": {...}}
Le backend ignore "details" ; il sert à la démo (/docs) et au débogage.

Lancement :  uvicorn main:app --port 8000
"""
import logging
from contextlib import asynccontextmanager
from typing import Dict, List

from fastapi import FastAPI, File, Form, UploadFile
from pydantic import BaseModel

from matcher import CvMatcher
from matcher.extraction import extract_pdf_text

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s : %(message)s")

matcher = CvMatcher()


@asynccontextmanager
async def lifespan(_app):
    matcher.semantic.load_async()  # chargement du modèle en arrière-plan
    yield


app = FastAPI(
    lifespan=lifespan,
    title="EniForum — Service IA de matching CV",
    version="2.0.0",
    description="Analyse des CV, extraction des compétences, score de pertinence par poste et justification.",
)


class AnalyzeResponse(BaseModel):
    score: float
    justification: str
    competences: List[str]
    details: Dict = {}


class TextRequest(BaseModel):
    texte_cv: str
    poste_vise: str = ""
    contexte: str = ""


@app.get("/health")
def health():
    return {"status": "ok", "moteur_semantique": matcher.semantic.status,
            "moteur_actif": matcher.semantic.engine.name}


@app.get("/postes")
def postes():
    """Fiches de poste utilisées pour le matching (data/postes.json)."""
    return {"roles": matcher.roles, "comites": matcher.comites}


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    file: UploadFile = File(...),
    poste_vise: str = Form(""),
    contexte: str = Form(""),
):
    text = extract_pdf_text(await file.read())
    r = matcher.analyze(text, poste_vise, contexte)
    return AnalyzeResponse(score=r.score, justification=r.justification,
                           competences=r.competences, details=r.details)


@app.post("/analyze-text", response_model=AnalyzeResponse)
def analyze_text(req: TextRequest):
    """Même analyse à partir d'un texte (pratique pour tester sans PDF)."""
    r = matcher.analyze(req.texte_cv, req.poste_vise, req.contexte)
    return AnalyzeResponse(score=r.score, justification=r.justification,
                           competences=r.competences, details=r.details)
