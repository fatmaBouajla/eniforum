"""Extraction d'informations : texte du PDF, dossier du formulaire, signaux du CV."""
import io
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from .text_utils import normalize, normalize_aligned, split_lines

# PDF


def extract_pdf_text(data: bytes) -> str:
    """Texte brut d'un PDF (pypdf). Retourne '' si illisible (scanné, protégé…)."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        parts = []
        for page in reader.pages:
            try:
                t = page.extract_text() or ""
            except Exception:
                t = ""
            if t.strip():
                parts.append(t)
        return "\n".join(parts)
    except Exception:
        return ""


# Dossier du formulaire

# Format produit par CandidatureCVService.deposerPublic (backend Spring Boot) :
# "Prénom:x | Nom:y | Tel:z | Niveau:3 | Comité:Design | Motivation:... | Expérience:... | Compétences:..."
_DOSSIER_KEYS = {
    "prenom": "prenom", "nom": "nom", "tel": "telephone", "niveau": "niveau",
    "comite": "comite", "motivation": "motivation", "experience": "experience",
    "competences": "competences",
}


def parse_dossier(contexte: str) -> Dict[str, str]:
    result: Dict[str, str] = {}
    if not contexte:
        return result
    for part in contexte.split("|"):
        if ":" not in part:
            continue
        key, value = part.split(":", 1)
        k = normalize(key).replace(" ", "")
        v = value.strip()
        if k in _DOSSIER_KEYS and v and v != "-" and v.lower() != "null":
            result[_DOSSIER_KEYS[k]] = v
    return result


# Signaux du CV

_SECTION_WORDS = [
    "formation", "education", "experience", "experiences", "competences", "skills",
    "langues", "languages", "projets", "projects", "certifications", "certificats",
    "vie associative", "activites", "centres d'interet", "loisirs", "interests", "profil",
    "parcours", "stages", "diplomes", "cursus",
]
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
_PHONE = re.compile(r"(\+?\d[\d .-]{7,}\d)")

_ASSOC = re.compile(
    r"\b(club|clubs|association|associatif|associative|ieee|enactus|jci|aiesec|rotaract|"
    r"leo|scout|scouts|croissant rouge|benevol\w*|volontari\w*|forum|evenement\w*|"
    r"comite|hackathon|competition|tunivisions|microsoft student|gdsc|google developer)\b"
)
_LEAD = re.compile(
    r"\b(president|presidente|vice[- ]president\w*|chef|cheffe|responsable|team lead\w*|leader|"
    r"coordinat\w*|tresorier\w*|secretaire general\w*|capitaine|fondat\w*|co-fondat\w*|"
    r"head of|manager|directeur|directrice|lead)\b"
)
_STAGE = re.compile(
    r"\b(stage|stages|stagiaire|internship|intern|pfe|alternance|freelance|projet de fin)\b"
)
_NIVEAU_CV = [
    (re.compile(r"\b(5\s*(eme|e|ème)?\s*annee|fin d'etudes|pfe)\b"), 5),
    (re.compile(r"\b(4\s*(eme|e)?\s*annee)\b"), 4),
    (re.compile(r"\b(3\s*(eme|e)?\s*annee|cycle ingenieur|cycle d'ingenieur)\b"), 3),
    (re.compile(r"\b(2\s*(eme|e)?\s*annee)\b"), 2),
    (re.compile(r"\b(1\s*(ere|er|re)?\s*annee|prepa|preparatoire)\b"), 1),
]


@dataclass
class CvSignals:
    est_un_cv: bool = True
    nb_mots: int = 0
    lignes_associatives: List[str] = field(default_factory=list)
    lignes_responsabilite: List[str] = field(default_factory=list)
    lignes_stage: List[str] = field(default_factory=list)
    niveau_cv: Optional[int] = None


def _extrait(line: str, start: int, end: int, marge: int = 40) -> str:
    """Morceau de ligne centré sur le mot repéré (pour citer le CV dans la justification)."""
    debut, fin = max(0, start - marge), min(len(line), end + marge)
    if debut > 0:
        espace = line.find(" ", debut)
        debut = espace + 1 if 0 <= espace < start else debut
    if fin < len(line):
        espace = line.rfind(" ", end, fin)
        fin = espace if espace > end else fin
    return ("…" if debut > 0 else "") + line[debut:fin].strip() + ("…" if fin < len(line) else "")


def analyse_signals(cv_text: str) -> CvSignals:
    s = CvSignals()
    norm_full = normalize(cv_text)
    s.nb_mots = len(norm_full.split())
    if s.nb_mots == 0:
        s.est_un_cv = False
        return s

    # Le document ressemble-t-il à un CV ? (rubriques, email, téléphone)
    indices = sum(1 for w in _SECTION_WORDS if w in norm_full)
    indices += 1 if _EMAIL.search(cv_text or "") else 0
    indices += 1 if _PHONE.search(cv_text or "") else 0
    # Un CV fait 1 à 2 pages : un document très long est plutôt un rapport ou un cours
    s.est_un_cv = indices >= 3 and s.nb_mots <= 2500

    for raw in split_lines(cv_text):
        line = normalize_aligned(raw)
        if len(line.strip()) < 4:
            continue
        for rx, bucket in ((_ASSOC, s.lignes_associatives),
                           (_LEAD, s.lignes_responsabilite),
                           (_STAGE, s.lignes_stage)):
            m = rx.search(line)
            if m:
                bucket.append(_extrait(raw, m.start(), m.end()))

    for rx, lvl in _NIVEAU_CV:
        if rx.search(norm_full):
            s.niveau_cv = lvl
            break
    return s


def parse_niveau(value: Optional[str]) -> Optional[int]:
    if not value:
        return None
    m = re.search(r"\d", value)
    if m:
        n = int(m.group())
        return n if 1 <= n <= 5 else None
    return None
