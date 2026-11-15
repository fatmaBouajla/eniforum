# Service IA de matching CV — EniForum

Microservice FastAPI appelé par le backend Spring Boot (`CvAiClient`) à chaque dépôt de CV
et à chaque clic sur « Relancer l'analyse ».

## Lancer
```bash
python -m venv .venv && source .venv/bin/activate   # Windows : .venv\Scripts\activate
pip install -r requirements.txt
python download_model.py      # une seule fois
uvicorn main:app --port 8000
```
Documentation interactive : http://localhost:8000/docs

## Points d'entrée
| Méthode | Route | Rôle |
|---|---|---|
| GET | `/health` | État du service et du modèle sémantique |
| GET | `/postes` | Fiches de poste utilisées |
| POST | `/analyze` | **Contrat backend** : multipart `file` (PDF), `poste_vise`, `contexte` |
| POST | `/analyze-text` | Même analyse à partir d'un texte JSON (tests, démo) |

Réponse : `{ "score": 0-100, "justification": "...", "competences": [...], "details": {...} }`
(le backend ignore `details`, qui contient le calcul complet).

## Organisation du code
```
main.py               API FastAPI
matcher/extraction.py texte PDF, dossier du formulaire, signaux (associatif, responsabilités, stages, niveau)
matcher/skills.py     catalogue de compétences + détection (synonymes, accents, FR/EN)
matcher/semantic.py   similarité sémantique (sentence-transformers) avec repli TF-IDF
matcher/scoring.py    score pondéré, recommandation, justification structurée
data/competences.json catalogue modifiable
data/postes.json      fiches de poste par comité et pondérations par rôle (modifiables)
tests/                tests unitaires (python -m pytest tests -q)
```

## Options
| Variable | Effet |
|---|---|
| `CV_AI_MODEL` | autre modèle sentence-transformers (défaut : `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`) |
| `CV_AI_DISABLE_EMBEDDINGS=1` | force le mode TF-IDF (léger, sans PyTorch) |

## Format de la justification
Une rubrique par ligne, lisible telle quelle et mise en forme par le frontend :
```
Recommandation : PRIORISER
Synthèse : Très bonne adéquation avec le poste « Chef de comité — Comité Design ».
Points forts : … ; …
Compétences manquantes : …, …
Points à vérifier : … ; …
Détail du score : Compétences clés 30/35 | Adéquation du profil 15/20 | …
Moteur : sémantique (paraphrase-multilingual-MiniLM-L12-v2)
```
