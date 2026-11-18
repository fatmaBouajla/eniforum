"""Tests du module RAG avec un modèle de langage simulé : python -m pytest tests -q"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("CV_AI_DISABLE_EMBEDDINGS", "1")

import pytest  # noqa: E402

from matcher import CvMatcher  # noqa: E402
from rag import EvaluateurRag  # noqa: E402
from rag.evaluation import nettoyer  # noqa: E402
from test_matcher import CV_DESIGN  # noqa: E402


class FauxModele:
    modele = "faux"
    pret = True

    def __init__(self, reponse):
        self.reponse = reponse
        self.prompt = ""

    def generer_json(self, prompt):
        self.prompt = prompt
        return self.reponse


@pytest.fixture(scope="module")
def matcher():
    m = CvMatcher()
    m.semantic.load_async()
    return m


def test_base_de_connaissances_par_comite(matcher):
    rag = EvaluateurRag(matcher, FauxModele({}))
    titres = [p.titre for p in rag.base.pour("design", "MEMBRE")]
    assert "Comité Design" in titres
    assert "Comité Sponsoring" not in titres
    assert "Ce qu'on attend d'un membre" in titres
    assert "Ce qu'on attend d'un chef de comité" not in titres


def test_recherche_des_passages_utiles(matcher):
    rag = EvaluateurRag(matcher, FauxModele({}))
    extraits_cv, extraits_guide = rag.rechercher(CV_DESIGN, "MEMBRE", "Comité:Design")
    assert any("affiches" in e.lower() or "figma" in e.lower() for e in extraits_cv[:3])
    assert extraits_guide[0].titre == "Comité Design"


def test_evaluation_complete(matcher):
    faux = FauxModele({
        "points_forts": [{"texte": "A réalisé des affiches pour un club (CV1)", "source": "[CV1]"}],
        "manques": [{"texte": "Pas de portfolio mentionné", "source": "G9"}],
        "questions_entretien": ["Q1 ?", "Q2 ?", "Q3 ?", "Q4 ?"],
    })
    rag = EvaluateurRag(matcher, faux)
    analyse = matcher.analyze(CV_DESIGN, "MEMBRE", "Comité:Design")
    r = rag.evaluer(CV_DESIGN, "MEMBRE", "Comité:Design", analyse)
    assert "Comité Design" in faux.prompt and "[CV1]" in faux.prompt
    assert r["points_forts"][0] == {"texte": "A réalisé des affiches pour un club.", "source": "CV1"}
    assert r["manques"][0]["source"] is None  # source inventée retirée
    assert len(r["questions_entretien"]) == 3
    assert "CV1" in r["sources"]


def test_reponse_incomplete_refusee():
    with pytest.raises(ValueError):
        nettoyer({"manques": [{"texte": "Pas de portfolio", "source": "G1"}]}, {"G1": "guide"})
    with pytest.raises(ValueError):
        nettoyer("pas du json", {})


def test_manque_contradictoire_retire():
    from rag.evaluation import contredit
    exp = {"associatif": 2, "responsabilites": 0, "stages": 0}
    assert contredit("Aucune expérience associative mentionnée.", exp)
    assert not contredit("Aucune expérience de responsabilité visible.", exp)
    assert not contredit("Maîtrise de Photoshop non démontrée.", exp)


def test_point_fort_invente_retire(matcher):
    faux = FauxModele({
        "points_forts": [{"texte": "Maîtrise Figma et Illustrator.", "source": "CV1"},
                         {"texte": "Maîtrise Excel pour le suivi budgétaire.", "source": "CV2"}],
        "questions_entretien": ["Q1 ?", "Q2 ?", "Q3 ?"],
    })
    rag = EvaluateurRag(matcher, faux)
    analyse = matcher.analyze(CV_DESIGN, "MEMBRE", "Comité:Design")
    r = rag.evaluer(CV_DESIGN, "MEMBRE", "Comité:Design", analyse)
    assert [p["texte"] for p in r["points_forts"]] == ["Maîtrise Figma et Illustrator."]
