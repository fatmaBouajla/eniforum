# syntax=docker/dockerfile:1.7
# =====================================================================
#  EniForum — Service IA de matching CV (FastAPI)
#  Le modèle sémantique est inclus dans l'image : fonctionne hors ligne.
# =====================================================================
ARG PYTHON_VERSION=3.11
ARG MODEL_NAME=sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2

# ---------- 1. Dépendances + modèle ----------
FROM python:${PYTHON_VERSION}-slim AS build
ARG MODEL_NAME
# Téléchargements robustes : nouvelles tentatives + cache pip conservé entre deux builds
# (une connexion coupée en plein téléchargement ne fait plus tout recommencer).
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_DEFAULT_TIMEOUT=120 PIP_RETRIES=10 \
    VIRTUAL_ENV=/opt/venv PATH="/opt/venv/bin:$PATH" \
    HF_HOME=/opt/hf
RUN python -m venv /opt/venv
# PyTorch CPU : ~4x plus léger que la version GPU
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install torch==2.5.1 --index-url https://download.pytorch.org/whl/cpu
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt
# Téléchargement du modèle au build (et non au premier démarrage)
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('${MODEL_NAME}')" \
 && find /opt/venv -type d -name "__pycache__" -prune -exec rm -rf {} + \
 && rm -rf /opt/venv/lib/python*/site-packages/torch/include

# ---------- 2. Exécution ----------
FROM python:${PYTHON_VERSION}-slim
ARG MODEL_NAME
LABEL org.opencontainers.image.title="eniforum-ai" \
      org.opencontainers.image.description="Service IA de matching CV (sentence-transformers multilingue)" \
      org.opencontainers.image.source="https://github.com/fatmaBouajla/eniforum"

RUN groupadd -r app && useradd -r -g app -d /app app
COPY --from=build /opt/venv /opt/venv
COPY --from=build --chown=app:app /opt/hf /opt/hf
WORKDIR /app
COPY --chown=app:app main.py download_model.py ./
COPY --chown=app:app matcher ./matcher
COPY --chown=app:app data ./data

ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/opt/hf HF_HUB_OFFLINE=1 TRANSFORMERS_OFFLINE=1 \
    CV_AI_MODEL=${MODEL_NAME} OMP_NUM_THREADS=2
USER app
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=5 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health',timeout=2).status==200 else 1)"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
