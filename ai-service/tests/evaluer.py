"""Évalue la qualité du classement sur les 30 CV étiquetés (tests/donnees).

Usage : python tests/evaluer.py            (modèle sémantique)
        CV_AI_DISABLE_EMBEDDINGS=1 python tests/evaluer.py   (mode TF-IDF)
Écrit un rapport dans tests/donnees/rapport_evaluation.md
"""
import itertools
import json
import os
import sys
import time
from pathlib import Path

ICI = Path(__file__).resolve().parent
sys.path.insert(0, str(ICI.parent))

from matcher import CvMatcher  # noqa: E402
from matcher.extraction import extract_pdf_text  # noqa: E402

COMITES = ["Sponsoring", "Design", "Logistique", "Projet", "Programme", "Média"]
ATTENDU = {"fort": "PRIORISER", "moyen": "ENTRETIEN", "faible": "RESERVE"}


def dossier(cv, comite):
    motivation = (f"Je souhaite rejoindre le comité {comite} du Forum pour mettre mes compétences "
                  "au service de l'événement et travailler en équipe.")
    return (f"Prénom:x | Nom:y | Tel:0 | Niveau:{cv['annee']} | Comité:{comite} | "
            f"Motivation:{motivation} | Expérience:- | Compétences:-")


def main():
    m = CvMatcher()
    if os.getenv("CV_AI_DISABLE_EMBEDDINGS") != "1":
        m.semantic._load()           # chargement synchrone pour l'évaluation
    jeu = json.loads((ICI / "donnees" / "jeu_evaluation.json").read_text(encoding="utf-8"))

    t0 = time.time()
    scores = {}                      # (cv, comité) -> résultat
    for cv in jeu:
        texte = extract_pdf_text((ICI / "donnees" / "cvs" / f"{cv['id']}.pdf").read_bytes())
        for c in COMITES:
            scores[(cv["id"], c)] = m.analyze(texte, "MEMBRE", dossier(cv, c))
    duree = (time.time() - t0) / len(scores)

    # 1) Le bon comité arrive-t-il en tête ? (profils forts et moyens)
    utiles = [cv for cv in jeu if cv["niveau"] != "faible"]
    top1 = sum(max(COMITES, key=lambda c: scores[(cv["id"], c)].score) == cv["comite_cible"] for cv in utiles)

    # 2) Dans chaque comité : fort > moyen > faible ?
    paires, bonnes = 0, 0
    rang = {"fort": 2, "moyen": 1, "faible": 0}
    for c in COMITES:
        cands = [cv for cv in jeu if cv["comite_cible"] == c]
        for a, b in itertools.combinations(cands, 2):
            if rang[a["niveau"]] == rang[b["niveau"]]:
                continue
            haut, bas = (a, b) if rang[a["niveau"]] > rang[b["niveau"]] else (b, a)
            paires += 1
            bonnes += scores[(haut["id"], c)].score > scores[(bas["id"], c)].score

    # 3) Recommandation attendue sur le comité ciblé
    reco_ok = 0
    lignes = []
    for cv in jeu:
        r = scores[(cv["id"], cv["comite_cible"])]
        code = r.details["recommandation"]["code"]
        reco_ok += code == ATTENDU[cv["niveau"]]
        lignes.append(f"| {cv['id']} | {cv['comite_cible']} | {cv['niveau']} | {r.score:.1f} | {code} |")

    moteur = m.semantic.engine.name
    rapport = "\n".join([
        "# Rapport d'évaluation du matching IA", "",
        f"Moteur : {moteur}  ", f"CV : {len(jeu)} (6 comités × 2 forts, 2 moyens, 1 faible)  ",
        f"Temps moyen par analyse : {duree * 1000:.0f} ms", "",
        "| Indicateur | Résultat |", "|---|---|",
        f"| Bon comité en tête (profils forts et moyens) | {top1}/{len(utiles)} ({top1 / len(utiles):.0%}) |",
        f"| Ordre fort > moyen > faible dans un comité | {bonnes}/{paires} ({bonnes / paires:.0%}) |",
        f"| Recommandation attendue (fort→prioriser, moyen→entretien, faible→réserve) | {reco_ok}/{len(jeu)} ({reco_ok / len(jeu):.0%}) |",
        "", "## Détail (comité ciblé)", "", "| CV | Comité | Niveau | Score | Recommandation |",
        "|---|---|---|---|---|", *lignes, ""])
    (ICI / "donnees" / "rapport_evaluation.md").write_text(rapport, encoding="utf-8")
    print(rapport)


if __name__ == "__main__":
    main()
