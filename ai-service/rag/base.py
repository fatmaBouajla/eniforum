"""Base de connaissances du recrutement : guides en Markdown découpés en passages."""
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List

from matcher.text_utils import normalize

DOSSIER = Path(__file__).resolve().parent.parent / "data" / "connaissances"


@dataclass
class Passage:
    source: str
    titre: str
    texte: str
    comite: str  # clé du comité concerné, ou "" si le passage est général
    role: str    # rôle concerné (MEMBRE, CHEF_COMITE, COORDINATRICE), ou "" si général


ROLES = {"membre": "MEMBRE", "chef": "CHEF_COMITE", "coordinat": "COORDINATRICE"}


class BaseConnaissances:
    def __init__(self, dossier: Path = DOSSIER, comites: List[str] = ()):
        self.passages: List[Passage] = []
        for fichier in sorted(dossier.glob("*.md")):
            self._charger(fichier, [c for c in comites if c != "general"])

    def _charger(self, fichier: Path, comites: List[str]) -> None:
        for bloc in re.split(r"\n(?=## )", fichier.read_text(encoding="utf-8")):
            lignes = bloc.strip().splitlines()
            if not lignes or not lignes[0].startswith("## "):
                continue
            titre = lignes[0][3:].strip()
            texte = " ".join(l.strip() for l in lignes[1:] if l.strip())
            t = normalize(titre)
            cle = next((c for c in comites if c in t), "")
            role = next((r for mot, r in ROLES.items() if mot in t), "")
            self.passages.append(Passage(fichier.stem, titre, texte, cle, role))

    def pour(self, comite: str, role: str) -> List[Passage]:
        """Passages du comité et du rôle visés, plus les passages généraux."""
        return [p for p in self.passages if p.comite in ("", comite) and p.role in ("", role)]
