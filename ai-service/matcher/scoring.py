"""Calcul du score de matching CV ↔ poste et rédaction de la justification."""
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .extraction import CvSignals, analyse_signals, parse_dossier, parse_niveau
from .semantic import SemanticScorer
from .skills import DATA_DIR, SkillCatalog
from .text_utils import chunk_text, normalize

DIMENSIONS = {
    "competences": "Compétences clés",
    "semantique": "Adéquation du profil",
    "experience": "Expérience & responsabilités",
    "formation": "Formation & langues",
    "motivation": "Motivation",
}

RECOMMANDATIONS = [
    (70, "PRIORISER", "Profil à prioriser"),
    (50, "ENTRETIEN", "À rencontrer en entretien"),
    (0, "RESERVE", "Profil moins adapté à ce poste"),
]

_COMITE_ALIASES = {
    "sponsoring": "sponsoring", "sponsor": "sponsoring",
    "design": "design",
    "logistique": "logistique",
    "programme": "programme",
    "projet": "projet",
    "media": "media", "communication": "media",
}


@dataclass
class MatchResult:
    score: float
    justification: str
    competences: List[str]
    details: Dict = field(default_factory=dict)


def _short(text: str, n: int = 70) -> str:
    # ; et | servent de séparateurs dans la justification : on les neutralise dans les citations
    text = " ".join(text.replace(";", ",").replace("|", "/").split())
    return text if len(text) <= n else text[: n - 1].rstrip() + "…"


def _join(items: List[str], n: int = 4) -> str:
    items = list(dict.fromkeys(items))
    return ", ".join(items[:n]) + (f" (+{len(items) - n})" if len(items) > n else "")


class CvMatcher:
    def __init__(self, postes_path: Path = DATA_DIR / "postes.json"):
        self.catalog = SkillCatalog()
        cfg = json.loads(Path(postes_path).read_text(encoding="utf-8"))
        self.roles: Dict = cfg["roles"]
        self.comites: Dict = cfg["comites"]
        self.semantic = SemanticScorer()
        unknown = [s for c in self.comites.values() for s in c["requises"] + c["atouts"]
                   if s not in self.catalog]
        unknown += [s for r in self.roles.values() for s in r["requises_en_plus"] if s not in self.catalog]
        if unknown:
            raise ValueError(f"Compétences absentes du catalogue : {sorted(set(unknown))}")

    # Poste visé
    def resolve_poste(self, poste_vise: str, dossier: Dict[str, str]) -> Tuple[str, str]:
        p = normalize(poste_vise)
        if "coordinat" in p:
            role = "COORDINATRICE"
        elif "chef" in p:
            role = "CHEF_COMITE"
        else:
            role = "MEMBRE"
        comite = "general"
        for source in (normalize(dossier.get("comite", "")), p):
            for alias, key in _COMITE_ALIASES.items():
                if alias in source:
                    comite = key
                    break
            if comite != "general":
                break
        if role == "COORDINATRICE" and comite == "general":
            comite = "projet"  # la coordination générale s'appuie sur la fiche « pilotage »
        return role, comite

    # Analyse
    def analyze(self, cv_text: str, poste_vise: str = "", contexte: str = "") -> MatchResult:
        dossier = parse_dossier(contexte)
        role_key, comite_key = self.resolve_poste(poste_vise, dossier)
        role, comite = self.roles[role_key], self.comites[comite_key]
        poste_label = f"{role['libelle']} — {comite['libelle']}"
        poids = role["poids"]

        cv_text = cv_text or ""
        cv_lisible = len(cv_text.split()) >= 10
        declared_text = " ".join(filter(None, [dossier.get("competences"), dossier.get("experience")]))
        signals = analyse_signals(cv_text) if cv_lisible else CvSignals(est_un_cv=False)
        signals_form = analyse_signals(dossier.get("experience", ""))

        sub: Dict[str, float] = {}
        forts: List[str] = []
        a_verifier: List[str] = []

        # 1) Compétences
        requises = list(dict.fromkeys(comite["requises"] + role["requises_en_plus"]))
        atouts = [a for a in comite["atouts"] if a not in requises]
        cv_skills = self.catalog.detect(cv_text)
        declared = [s for s in self.catalog.detect(declared_text) if s not in cv_skills]

        # Les savoir-être d'encadrement se prouvent aussi par les rôles occupés
        # (« Présidente du club », « Responsable design »…), même sans le mot « leadership ».
        a_des_responsabilites = bool(signals.lignes_responsabilite or signals_form.lignes_responsabilite)
        prouve_par_role = {"Leadership", "Gestion d'équipe", "Coordination"}

        def credit(skill: str) -> float:
            if skill in cv_skills:
                return 1.0
            if a_des_responsabilites and skill in prouve_par_role:
                return 0.8
            return 0.6 if skill in declared else 0.0

        req_score = sum(credit(s) for s in requises) / len(requises) if requises else 1.0
        bonus_score = min(1.0, sum(credit(s) for s in atouts) / max(3.0, len(atouts) * 0.4))
        sub["competences"] = 0.7 * req_score + 0.3 * bonus_score

        presentes = [s for s in requises + atouts if s in cv_skills]
        manquantes = [s for s in requises if credit(s) == 0] + [s for s in atouts if credit(s) == 0][:3]
        declarees_non_prouvees = [s for s in requises + atouts if s in declared]
        if presentes:
            forts.append(f"Compétences utiles au poste : {_join(presentes, 5)}")
        if declarees_non_prouvees:
            a_verifier.append(
                f"Compétences déclarées dans le formulaire mais absentes du CV : {_join(declarees_non_prouvees)}")

        # 2) Adéquation sémantique
        attentes = comite["attentes"] + role["attentes_en_plus"]
        chunks = chunk_text(cv_text) + chunk_text(dossier.get("experience", ""))
        sem, sem_details, moteur = self.semantic.match(attentes, chunks)
        sub["semantique"] = sem
        bien = [d for d in sem_details if d[1] >= 0.6]
        faible = sorted([d for d in sem_details if d[1] < 0.25], key=lambda d: d[1])
        if bien:
            best = max(bien, key=lambda d: d[1])
            forts.append(f"Répond à l'attente « {best[0]} » (ex. : « {_short(best[2], 60)} »)")
        attentes_faibles = [f"Peu d'éléments sur : « {att} »" for att, _, _ in faible[:2]]

        # 3) Expérience & responsabilités
        assoc = signals.lignes_associatives + signals_form.lignes_associatives
        lead = signals.lignes_responsabilite + signals_form.lignes_responsabilite
        stages = signals.lignes_stage + signals_form.lignes_stage
        n_assoc, n_lead, n_stage = len(set(assoc)), len(set(lead)), len(set(stages))
        f_assoc = min(1.0, n_assoc / 3)
        f_lead = 0.0 if n_lead == 0 else min(1.0, 0.4 + 0.3 * n_lead)   # 1 rôle = 0.7, 2 rôles = 1
        f_stage = min(1.0, n_stage / 2)
        if role_key == "MEMBRE":
            sub["experience"] = 0.6 * f_assoc + 0.15 * f_lead + 0.25 * f_stage
        elif role_key == "CHEF_COMITE":
            sub["experience"] = 0.4 * f_assoc + 0.45 * f_lead + 0.15 * f_stage
        else:
            sub["experience"] = 0.35 * f_assoc + 0.5 * f_lead + 0.15 * f_stage
        if lead:
            forts.append(f"Expérience de responsabilité : « {_short(lead[0], 60)} »")
        elif role_key != "MEMBRE":
            a_verifier.append("Aucune expérience de responsabilité visible pour un poste d'encadrement")
        if n_assoc >= 2:
            forts.append(f"Vie associative / événementielle active ({n_assoc} mentions)")
        elif n_assoc == 0:
            a_verifier.append("Pas d'expérience associative ou événementielle repérée")
        if n_stage:
            forts.append(f"Expérience professionnelle (stage / projet) : {n_stage} mention(s)")

        # 4) Formation & langues
        niveau = parse_niveau(dossier.get("niveau")) or signals.niveau_cv
        if role_key == "MEMBRE":
            table = {1: 0.75, 2: 0.85, 3: 1.0, 4: 1.0, 5: 0.9}
        else:
            table = {1: 0.4, 2: 0.6, 3: 0.85, 4: 1.0, 5: 0.95}
        f_niv = table.get(niveau, 0.6)
        langues = [s for s in cv_skills + declared if self.catalog.categorie(s) == "Langues"]
        f_lang = min(1.0, len(langues) / 3)
        sub["formation"] = 0.7 * f_niv + 0.3 * f_lang
        if len(langues) >= 3:
            forts.append(f"Trilingue ou plus : {_join(langues, 4)}")

        # 5) Motivation
        motivation = dossier.get("motivation", "")
        if motivation:
            mots = len(motivation.split())
            f_len = min(1.0, mots / 60)
            f_rel, _, _ = self.semantic.match(attentes, chunk_text(motivation, max_words=40, min_words=1))
            nm = normalize(motivation)
            f_cite = 1.0 if (comite_key in nm or "forum" in nm or "comite" in nm) else 0.0
            sub["motivation"] = min(1.0, 0.45 * f_len + 0.45 * f_rel + 0.10 * f_cite)
            if mots < 25:
                a_verifier.append("Lettre de motivation très courte")
            elif sub["motivation"] >= 0.7:
                forts.append("Motivation détaillée et en lien avec le comité")
        else:
            sub["motivation"] = 0.5
            a_verifier.append("Motivation non fournie")

        # Score final
        points = {k: sub[k] * poids[k] for k in DIMENSIONS}
        score = sum(points.values())

        plafond: Optional[int] = None
        if not cv_lisible:
            plafond = 45
            a_verifier.insert(0, "Texte du CV illisible (PDF scanné ou image) : score basé sur le formulaire seulement")
        elif not signals.est_un_cv:
            plafond = 30
            a_verifier.insert(0, "Le document déposé ne ressemble pas à un CV (rubriques, email, téléphone absents)")
        if plafond is not None:
            score = min(score, plafond)
        a_verifier += attentes_faibles  # les manques sémantiques passent après les points factuels
        score = round(max(0.0, min(100.0, score)), 1)

        code, libelle = next((c, l) for seuil, c, l in RECOMMANDATIONS if score >= seuil)

        # Justification structurée (lisible telle quelle, et mise en forme par le frontend)
        if code == "PRIORISER":
            synthese = f"Très bonne adéquation avec le poste « {poste_label} »."
        elif code == "ENTRETIEN":
            synthese = f"Adéquation correcte avec « {poste_label} » : quelques points à approfondir en entretien."
        else:
            synthese = f"Adéquation limitée avec « {poste_label} » au vu du CV fourni."
        detail = " | ".join(f"{DIMENSIONS[k]} {round(points[k])}/{poids[k]}" for k in DIMENSIONS)
        lignes = [
            f"Recommandation : {code}",
            f"Synthèse : {synthese}",
            f"Points forts : {' ; '.join(forts[:4]) if forts else 'aucun point fort net détecté'}",
        ]
        if manquantes:
            lignes.append(f"Compétences manquantes : {', '.join(dict.fromkeys(manquantes))}")
        if a_verifier:
            lignes.append(f"Points à vérifier : {' ; '.join(a_verifier[:5])}")
        lignes.append(f"Détail du score : {detail}")
        lignes.append(f"Moteur : {moteur}")

        ordre = requises + atouts
        competences = sorted(set(cv_skills + declared),
                             key=lambda s: (ordre.index(s) if s in ordre else len(ordre), s))[:15]

        return MatchResult(
            score=score,
            justification="\n".join(lignes),
            competences=competences,
            details={
                "poste": {"role": role_key, "comite": comite_key, "libelle": poste_label},
                "recommandation": {"code": code, "libelle": libelle},
                "sous_scores": {k: {"libelle": DIMENSIONS[k], "points": round(points[k], 1),
                                    "max": poids[k], "taux": round(sub[k], 3)} for k in DIMENSIONS},
                "competences_requises": requises,
                "competences_trouvees_cv": cv_skills,
                "competences_declarees": declared,
                "competences_manquantes": manquantes,
                "attentes": [{"attente": a, "score": round(s, 3), "extrait_cv": _short(c, 120)}
                             for a, s, c in sem_details],
                "experience": {"associatif": n_assoc, "responsabilites": n_lead, "stages": n_stage},
                "niveau": niveau,
                "est_un_cv": signals.est_un_cv,
                "plafond_applique": plafond,
                "moteur": moteur,
            },
        )
