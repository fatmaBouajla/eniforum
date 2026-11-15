"""Tests du moteur de matching (sans serveur ni modèle) : python -m pytest tests -q"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("CV_AI_DISABLE_EMBEDDINGS", "1")

import pytest  # noqa: E402

from matcher import CvMatcher  # noqa: E402
from matcher.extraction import parse_dossier  # noqa: E402

CV_DESIGN = """Yasmine Ben Salah
yasmine.bensalah@email.tn  +216 22 333 444
Profil
Étudiante en 3ème année génie informatique, passionnée de design graphique et d'identité visuelle.
Formation
2023 - Présent : Cycle ingénieur, ENICarthage
Expériences
2024 - 2025 : Responsable design du club IEEE ENICarthage : création des affiches, flyers et de la charte graphique
2024 : Bénévole au Forum ENICarthage : conception des badges et des kakémonos
Stage d'été 2024 : UI/UX design d'une application mobile (maquettes Figma, prototypage)
Compétences
Figma, Photoshop, Illustrator, Canva, montage vidéo (Premiere Pro), créativité, travail en équipe
Langues
Français courant, Anglais B2, Arabe langue maternelle
"""

CV_SPONSORING = """Mehdi Trabelsi
mehdi.trabelsi@email.tn  +216 55 666 777
Profil
Étudiant en 4ème année génie industriel, orienté relations entreprises.
Formation
Cycle ingénieur ENICarthage
Expériences
2024 - 2025 : Vice-président de l'association Enactus ENICarthage
2024 : Chargé de sponsoring du hackathon : prospection de 40 entreprises, négociation des packs partenaires
Stage commercial 2023 : relation client et vente chez un opérateur télécom
Compétences
Négociation, communication, prospection, partenariats, Excel, PowerPoint, prise de parole
Langues
Français, Anglais (TOEIC 850), Arabe
"""

CV_FAIBLE = """Sami Kefi
sami.kefi@email.tn
Formation
1ère année cycle préparatoire
Compétences
Langage C
"""

DOSSIER = ("Prénom:X | Nom:Y | Tel:+21600000000 | Niveau:{niveau} | Comité:{comite} | "
           "Motivation:{motivation} | Expérience:- | Compétences:{competences}")
MOTIVATION_DESIGN = ("Je souhaite diriger le comité design du forum car j'ai déjà conçu l'identité visuelle "
                     "de plusieurs événements du club IEEE. Je veux proposer une charte graphique moderne, "
                     "organiser l'équipe pour livrer les affiches et badges à temps et former les nouveaux membres "
                     "sur Figma et Canva.")


@pytest.fixture(scope="module")
def m():
    return CvMatcher()


def dossier(comite, niveau="3", motivation=MOTIVATION_DESIGN, competences="-"):
    return DOSSIER.format(comite=comite, niveau=niveau, motivation=motivation, competences=competences)


def test_parse_dossier():
    d = parse_dossier("Prénom:Ali | Niveau:4 | Comité:Média | Motivation:Bonjour | Expérience:-")
    assert d == {"prenom": "Ali", "niveau": "4", "comite": "Média", "motivation": "Bonjour"}


def test_resolution_poste(m):
    assert m.resolve_poste("CHEF_COMITE", {"comite": "Média"}) == ("CHEF_COMITE", "media")
    assert m.resolve_poste("MEMBRE", {"comite": "Sponsoring"}) == ("MEMBRE", "sponsoring")
    assert m.resolve_poste("Chef Comité Logistique", {}) == ("CHEF_COMITE", "logistique")
    assert m.resolve_poste("Coordinatrice Générale", {}) == ("COORDINATRICE", "projet")
    assert m.resolve_poste("", {})[1] == "general"


def test_contrat_backend(m):
    r = m.analyze(CV_DESIGN, "CHEF_COMITE", dossier("Design"))
    assert 0 <= r.score <= 100
    assert isinstance(r.justification, str) and r.justification.startswith("Recommandation : ")
    assert all(isinstance(c, str) for c in r.competences)
    assert "Détail du score : " in r.justification


def test_bon_profil_design_priorise(m):
    r = m.analyze(CV_DESIGN, "CHEF_COMITE", dossier("Design"))
    assert r.score >= 70, r.justification
    assert r.details["recommandation"]["code"] == "PRIORISER"
    for skill in ("Figma", "Photoshop", "Design graphique"):
        assert skill in r.competences


def test_chaque_cv_meilleur_dans_son_comite(m):
    design_d = m.analyze(CV_DESIGN, "CHEF_COMITE", dossier("Design")).score
    design_s = m.analyze(CV_DESIGN, "CHEF_COMITE", dossier("Sponsoring")).score
    spons_s = m.analyze(CV_SPONSORING, "CHEF_COMITE", dossier("Sponsoring")).score
    spons_d = m.analyze(CV_SPONSORING, "CHEF_COMITE", dossier("Design")).score
    assert design_d > design_s
    assert spons_s > spons_d
    assert spons_s > design_s


def test_classement(m):
    scores = {
        nom: m.analyze(cv, "CHEF_COMITE", dossier("Design")).score
        for nom, cv in {"design": CV_DESIGN, "sponsoring": CV_SPONSORING, "faible": CV_FAIBLE}.items()
    }
    assert scores["design"] > scores["sponsoring"] > scores["faible"]


def test_competences_manquantes_signalees(m):
    r = m.analyze(CV_FAIBLE, "CHEF_COMITE", dossier("Design", niveau="1", motivation="Motivé."))
    assert "Design graphique" in r.details["competences_manquantes"]
    assert r.details["recommandation"]["code"] == "RESERVE"
    assert "Lettre de motivation très courte" in r.justification


def test_competences_declarees_non_prouvees(m):
    r = m.analyze(CV_FAIBLE, "MEMBRE", dossier("Design", competences="Figma, Photoshop"))
    assert "Figma" in r.details["competences_declarees"]
    assert "absentes du CV" in r.justification


def test_document_qui_n_est_pas_un_cv(m):
    texte = ("Travaux pratiques numéro 4 : les listes chaînées. Exercice 1 : écrire une fonction qui "
             "insère un élément en tête de liste. Exercice 2 : supprimer les doublons. ") * 5
    r = m.analyze(texte, "MEMBRE", dossier("Design"))
    assert r.score <= 30
    assert "ne ressemble pas à un CV" in r.justification


def test_cv_illisible(m):
    r = m.analyze("", "MEMBRE", dossier("Design"))
    assert r.score <= 45
    assert "illisible" in r.justification


def test_citation_du_cv_avec_accents(m):
    r = m.analyze(CV_SPONSORING, "CHEF_COMITE", dossier("Sponsoring"))
    assert "Vice-président" in r.justification
