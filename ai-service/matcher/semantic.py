"""Similarité sémantique entre le CV et les attentes du poste.

Deux moteurs, choisis automatiquement :
  1. Embeddings multilingues (sentence-transformers, modèle local, FR/EN)
     -> comprend que « animer la page Instagram du club » correspond à
        « gérer les réseaux sociaux », même sans mot commun.
  2. Repli TF-IDF (pur Python) si le modèle n'est pas installé ou pas encore chargé.
Le modèle est chargé en arrière-plan au démarrage : le service répond toujours.
"""
import logging
import math
import os
import threading
from collections import Counter
from typing import List, Optional

from .text_utils import tokens

log = logging.getLogger("cv-ai")

DEFAULT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def _rescale(value: float, low: float, high: float) -> float:
    """Ramène une similarité brute dans [0, 1] (calibrage par moteur)."""
    return max(0.0, min(1.0, (value - low) / (high - low)))


class TfidfEngine:
    name = "lexical (TF-IDF)"
    # Calibrage : 0.03 ~ aucun rapport, 0.30 ~ très proche
    low, high = 0.03, 0.30

    def similarity_matrix(self, queries: List[str], docs: List[str]) -> List[List[float]]:
        q_tok = [tokens(q) for q in queries]
        d_tok = [tokens(d) for d in docs]
        corpus = q_tok + d_tok
        n = len(corpus)
        df = Counter()
        for toks in corpus:
            df.update(set(toks))
        idf = {t: math.log((n + 1) / (c + 1)) + 1 for t, c in df.items()}

        def vec(toks):
            tf = Counter(toks)
            return {t: (1 + math.log(c)) * idf[t] for t, c in tf.items()}

        qv, dv = [vec(t) for t in q_tok], [vec(t) for t in d_tok]

        def cos(a, b):
            dot = sum(v * b.get(k, 0.0) for k, v in a.items())
            na = math.sqrt(sum(v * v for v in a.values()))
            nb = math.sqrt(sum(v * v for v in b.values()))
            return dot / (na * nb) if na and nb else 0.0

        return [[cos(q, d) for d in dv] for q in qv]


class EmbeddingEngine:
    # Calibrage MiniLM multilingue : 0.15 ~ hors sujet, 0.60 ~ même idée
    low, high = 0.15, 0.60

    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer  # import lourd, donc local
        self.model = SentenceTransformer(model_name)
        self.name = f"sémantique ({model_name})"

    def similarity_matrix(self, queries: List[str], docs: List[str]) -> List[List[float]]:
        q = self.model.encode(queries, normalize_embeddings=True)
        d = self.model.encode(docs, normalize_embeddings=True)
        return (q @ d.T).tolist()


class SemanticScorer:
    def __init__(self):
        self.tfidf = TfidfEngine()
        self.embedding: Optional[EmbeddingEngine] = None
        self.status = "désactivé"
        self._lock = threading.Lock()
        self._pret = threading.Event()   # levé quand le chargement est terminé (réussi ou non)

    # Chargement
    def load_async(self) -> None:
        if os.getenv("CV_AI_DISABLE_EMBEDDINGS", "").lower() in ("1", "true", "yes"):
            self.status = "désactivé (CV_AI_DISABLE_EMBEDDINGS)"
            self._pret.set()
            return
        self.status = "chargement"
        threading.Thread(target=self._load, daemon=True).start()

    def _load(self) -> None:
        model = os.getenv("CV_AI_MODEL", DEFAULT_MODEL)
        try:
            engine = EmbeddingEngine(model)
            with self._lock:
                self.embedding = engine
            self.status = "prêt"
            log.info("Modèle sémantique chargé : %s", model)
        except Exception as exc:  # paquet absent, pas de réseau au 1er lancement…
            self.status = f"indisponible ({type(exc).__name__})"
            log.warning("Modèle sémantique indisponible, repli TF-IDF : %s", exc)
        finally:
            self._pret.set()

    def attendre(self, secondes: float) -> None:
        """Attend la fin du chargement : tous les CV sont notés avec le même moteur."""
        if self.status == "chargement":
            self._pret.wait(secondes)

    @property
    def engine(self):
        with self._lock:
            return self.embedding or self.tfidf

    # Calcul
    def match(self, attentes: List[str], chunks: List[str]):
        """Pour chaque attente du poste : meilleure similarité avec un bloc du CV.
        Retourne (score global 0-1, [(attente, score 0-1, extrait du CV)], nom du moteur)."""
        self.attendre(float(os.getenv("CV_AI_ATTENTE_MODELE", "120")))
        engine = self.engine
        if not attentes or not chunks:
            return 0.0, [], engine.name
        try:
            matrix = engine.similarity_matrix(attentes, chunks)
        except Exception as exc:
            log.warning("Erreur moteur %s, repli TF-IDF : %s", engine.name, exc)
            engine = self.tfidf
            matrix = engine.similarity_matrix(attentes, chunks)
        details = []
        for attente, row in zip(attentes, matrix):
            best = max(range(len(row)), key=lambda i: row[i])
            details.append((attente, _rescale(row[best], engine.low, engine.high), chunks[best]))
        # moyenne des attentes, en valorisant un peu les meilleures correspondances
        scores = sorted((d[1] for d in details), reverse=True)
        weights = [1.0 / (1 + 0.15 * i) for i in range(len(scores))]
        global_score = sum(s * w for s, w in zip(scores, weights)) / sum(weights)
        return global_score, details, engine.name
