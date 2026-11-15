"""Catalogue de compétences et détection dans un texte."""
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Pattern

from .text_utils import normalize

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@dataclass
class Skill:
    nom: str
    categorie: str
    patterns: List[Pattern]


def _pattern(synonyme: str) -> Pattern:
    s = re.escape(normalize(synonyme))
    s = s.replace(r"\ ", r"[\s\-]+")  # "gestion de projet" == "gestion-de-projet"
    return re.compile(r"(?<![a-z0-9])" + s + r"(?![a-z0-9+#])")


class SkillCatalog:
    def __init__(self, path: Path = DATA_DIR / "competences.json"):
        raw = json.loads(Path(path).read_text(encoding="utf-8"))
        self.skills: Dict[str, Skill] = {}
        for item in raw["competences"]:
            syns = set(item.get("synonymes", [])) | {item["nom"]}
            self.skills[item["nom"]] = Skill(
                nom=item["nom"],
                categorie=item.get("categorie", "Autre"),
                patterns=[_pattern(x) for x in syns if x.strip()],
            )

    def __contains__(self, nom: str) -> bool:
        return nom in self.skills

    def detect(self, text: str) -> List[str]:
        """Compétences du catalogue présentes dans le texte (ordre du catalogue)."""
        norm = normalize(text)
        if not norm:
            return []
        return [nom for nom, sk in self.skills.items() if any(p.search(norm) for p in sk.patterns)]

    def categorie(self, nom: str) -> str:
        sk = self.skills.get(nom)
        return sk.categorie if sk else "Autre"
