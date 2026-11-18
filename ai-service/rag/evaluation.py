"""Analyse détaillée d'une candidature (RAG).

1. Recherche : passages du CV les plus proches des attentes du poste,
   et passages du guide de recrutement les plus utiles pour ce comité.
2. Génération : le modèle de langage rédige l'analyse à partir de ces seuls passages.
Le score reste celui du matching : le modèle explique, il ne note pas.
"""
import re
from typing import Dict, List

from matcher.extraction import parse_dossier
from matcher.scoring import CvMatcher, MatchResult
from matcher.text_utils import chunk_text

from .base import BaseConnaissances
from .llm import ClientOllama

NB_PASSAGES_CV = 6
NB_PASSAGES_GUIDE = 3

CONSIGNE = """Tu aides le jury du Forum d'Entreprises ENICarthage à étudier une candidature.
Candidat(e) : {prenom}. Poste visé : {poste}.
Résultat du matching automatique : {score}/100, recommandation {recommandation}.
Compétences trouvées dans le CV : {trouvees}.
Compétences attendues absentes : {manquantes}.
Expériences repérées dans le CV : {experiences}.
Manques constatés par le matching : {constates}.

Extraits du CV du candidat :
{extraits_cv}

Extraits du guide de recrutement du forum :
{extraits_guide}

Rédige en français une analyse courte et factuelle, en t'appuyant uniquement sur ces extraits.
N'invente aucune expérience et ne déduis aucune compétence de la formation.
Les manques reprennent uniquement les manques constatés ci-dessus, reformulés et justifiés par le guide.
Désigne la personne par son prénom. Chaque point fort cite un fait précis d'un extrait du CV (expérience, réalisation ou outil). Chaque point est une phrase complète. Indique l'extrait utilisé (ex. "CV2" ou "G1") seulement dans le champ "source".
Réponds uniquement avec ce JSON :
{{"points_forts": [{{"texte": "...", "source": "CV1"}}, {{"texte": "...", "source": "CV3"}}],
 "manques": [{{"texte": "...", "source": "G1"}}, {{"texte": "...", "source": "G2"}}],
 "questions_entretien": ["...", "...", "..."]}}
Règles : 2 à 4 points forts tirés des extraits du CV, 0 à 3 manques,
exactement 3 questions d'entretien qui vérifient ces manques ou mettent le candidat en situation dans son comité."""


class EvaluateurRag:
    def __init__(self, matcher: CvMatcher, llm: ClientOllama = None):
        self.matcher = matcher
        self.llm = llm or ClientOllama()
        self.base = BaseConnaissances(comites=list(matcher.comites))

    def rechercher(self, cv_text: str, poste_vise: str, contexte: str):
        dossier = parse_dossier(contexte)
        role_key, comite_key = self.matcher.resolve_poste(poste_vise, dossier)
        role, comite = self.matcher.roles[role_key], self.matcher.comites[comite_key]
        attentes = comite["attentes"] + role["attentes_en_plus"]
        self.matcher.semantic.attendre(120)
        moteur = self.matcher.semantic.engine

        blocs = list(dict.fromkeys(chunk_text(cv_text) + chunk_text(dossier.get("experience", ""))))
        extraits_cv: List[str] = []
        if blocs:
            sim = moteur.similarity_matrix(attentes, blocs)
            meilleur = [max(sim[i][j] for i in range(len(attentes))) for j in range(len(blocs))]
            rang = sorted(range(len(blocs)), key=lambda j: meilleur[j], reverse=True)
            extraits_cv = [blocs[j] for j in rang[:NB_PASSAGES_CV]]

        passages = self.base.pour(comite_key, role_key)
        requete = " ".join([comite["libelle"], comite["description"], role["libelle"]] + attentes)
        extraits_guide = []
        if passages:
            sim = moteur.similarity_matrix([requete], [p.texte for p in passages])[0]
            rang = sorted(range(len(passages)), key=lambda j: sim[j], reverse=True)
            extraits_guide = [passages[j] for j in rang[:NB_PASSAGES_GUIDE]]
        return extraits_cv, extraits_guide

    def evaluer(self, cv_text: str, poste_vise: str, contexte: str, analyse: MatchResult) -> Dict:
        extraits_cv, extraits_guide = self.rechercher(cv_text, poste_vise, contexte)
        sources = {f"CV{i}": t for i, t in enumerate(extraits_cv, 1)}
        sources.update({f"G{i}": f"{p.titre} : {p.texte}" for i, p in enumerate(extraits_guide, 1)})

        d = analyse.details
        prompt = CONSIGNE.format(
            prenom=parse_dossier(contexte).get("prenom") or "la personne candidate",
            poste=d["poste"]["libelle"],
            score=analyse.score,
            recommandation=d["recommandation"]["libelle"],
            trouvees=", ".join(d["competences_trouvees_cv"]) or "aucune",
            manquantes=", ".join(d["competences_manquantes"]) or "aucune",
            experiences="{associatif} associative(s) ou événementielle(s), {responsabilites} poste(s) "
                        "de responsabilité, {stages} stage(s) ou projet(s)".format(**d["experience"]),
            constates=" ; ".join(manques_constates(analyse)) or "aucun",
            extraits_cv="\n".join(f"[CV{i}] {t}" for i, t in enumerate(extraits_cv, 1)) or "(CV illisible)",
            extraits_guide="\n".join(f"[G{i}] {p.titre} : {p.texte}" for i, p in enumerate(extraits_guide, 1)),
        )
        brut = self.llm.generer_json(prompt)
        resultat = nettoyer(brut, sources)
        resultat["manques"] = [m for m in resultat["manques"] if not contredit(m["texte"], d["experience"])]
        connues = set(d["competences_trouvees_cv"]) | set(d["competences_declarees"])
        resultat["points_forts"] = [p for p in resultat["points_forts"] if not self.invente(p["texte"], connues)]
        resultat["sources"] = sources
        resultat["modele"] = self.llm.modele
        return resultat


    def invente(self, texte: str, connues: set) -> bool:
        """Vrai si le texte attribue un outil ou une compétence technique absente du CV."""
        catalogue = self.matcher.catalog
        return any(c not in connues for c in catalogue.detect(texte) if catalogue.categorie(c) != "Soft skills")


def manques_constates(analyse: MatchResult) -> List[str]:
    """Manques vérifiés par le matching : compétences absentes et points à vérifier."""
    constates = []
    if analyse.details["competences_manquantes"]:
        constates.append("compétences absentes du CV : " + ", ".join(analyse.details["competences_manquantes"]))
    for ligne in analyse.justification.splitlines():
        if ligne.startswith("Points à vérifier :"):
            constates += [p.strip() for p in ligne.split(":", 1)[1].split(";") if p.strip()]
    return constates


# Garde-fou : un manque ne peut pas nier une expérience que le matching a trouvée
_NEGATION = re.compile(r"\b(pas|aucune?|manque|absence|sans)\b")
_THEMES = {"associatif": r"associati|événementi|evenementi|bénévol", "responsabilites": r"responsab|encadr|dirig",
           "stages": r"\bstages?\b"}


def contredit(texte: str, experience: Dict) -> bool:
    t = texte.lower()
    return bool(_NEGATION.search(t)) and any(
        experience.get(cle, 0) > 0 and re.search(motif, t) for cle, motif in _THEMES.items())


def _items(valeur, sources: Dict[str, str], maxi: int) -> List[Dict]:
    items = []
    for v in valeur if isinstance(valeur, list) else []:
        texte = v.get("texte") if isinstance(v, dict) else v
        if not isinstance(texte, str) or not texte.strip():
            continue
        source = v.get("source") if isinstance(v, dict) else None
        source = str(source).strip("[] ") if source else None
        texte = re.sub(r"\s*[\[(](CV|G)\d+[\])]\s*", " ", texte).strip(" .") + "."
        items.append({"texte": texte[:300], "source": source if source in sources else None})
    return items[:maxi]


def nettoyer(brut: Dict, sources: Dict[str, str]) -> Dict:
    """Garde uniquement une réponse bien formée ; les sources inventées sont retirées."""
    if not isinstance(brut, dict):
        raise ValueError("Réponse du modèle illisible")
    questions = [q.strip()[:250] for q in brut.get("questions_entretien", []) if isinstance(q, str) and q.strip()]
    resultat = {
        "points_forts": [p for p in _items(brut.get("points_forts"), sources, 4)
                         if p["source"] is None or p["source"].startswith("CV")],
        "manques": _items(brut.get("manques"), sources, 3),
        "questions_entretien": questions[:3],
    }
    if not resultat["points_forts"] and not resultat["questions_entretien"]:
        raise ValueError("Réponse du modèle incomplète")
    return resultat
