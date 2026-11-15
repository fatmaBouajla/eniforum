"""Génère des CV fictifs (PDF + JSON) pour la démo et l'évaluation de l'IA.

Usage : python tests/outils/generer_cvs.py
Sorties :
  tests/donnees/cvs/*.pdf + tests/donnees/jeu_evaluation.json   (30 CV étiquetés)
  ../backend/src/main/resources/demo/cv/*.pdf                   (6 CV de démo)
Toutes les personnes sont inventées.
"""
import json
import random
import textwrap
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

ICI = Path(__file__).resolve().parent
DONNEES = ICI.parent / "donnees"
DEMO = ICI.parents[2] / "backend" / "src" / "main" / "resources" / "demo" / "cv"

PRENOMS = ["Amira", "Youssef", "Nour", "Skander", "Rania", "Hamza", "Eya", "Aziz", "Mariem", "Ahmed",
           "Sirine", "Fares", "Ines", "Bilel", "Chaima", "Oussama", "Lina", "Wassim", "Malek", "Yasmine",
           "Khalil", "Asma", "Rayen", "Ons", "Mohamed", "Salma", "Firas", "Hiba", "Adam", "Emna"]
NOMS = ["Ben Amor", "Trabelsi", "Gharbi", "Jlassi", "Mansouri", "Hammami", "Ayari", "Khelifi", "Saidi",
        "Bouzid", "Ferchichi", "Chebbi", "Dridi", "Mejri", "Zouari", "Haddad", "Riahi", "Sassi", "Kefi",
        "Masmoudi", "Ghanmi", "Baccouche", "Toumi", "Abidi", "Mzoughi", "Nasri", "Hajji", "Belhadj", "Tlili", "Jaziri"]
FILIERES = ["Génie informatique", "Génie industriel", "Génie électrique", "Génie mécanique",
            "Génie des procédés", "Génie civil"]

# Profil type de chaque comité : compétences, expériences, projets
PROFILS = {
    "Sponsoring": {
        "comp": ["Négociation", "Prospection d'entreprises", "Communication", "Partenariats", "Excel",
                 "PowerPoint", "Relation client", "Prise de parole", "Anglais professionnel"],
        "exp": ["Chargé de sponsoring du hackathon {club} : 25 entreprises contactées, 6 partenaires signés",
                "Responsable relations entreprises de {club} : négociation des packs partenaires",
                "Stage commercial chez un opérateur télécom : relation client et vente",
                "Bénévole au Forum ENICarthage : accueil des entreprises partenaires"],
    },
    "Design": {
        "comp": ["Figma", "Photoshop", "Illustrator", "Canva", "Design graphique", "Identité visuelle",
                 "UI/UX design", "Créativité", "InDesign"],
        "exp": ["Responsable design de {club} : affiches, flyers et charte graphique",
                "Conception des badges et kakémonos du Forum ENICarthage",
                "Stage UI/UX : maquettes Figma et prototypage d'une application mobile",
                "Création de l'identité visuelle d'un événement étudiant"],
    },
    "Logistique": {
        "comp": ["Organisation", "Logistique", "Gestion de stock", "Planification", "Gestion de crise",
                 "Gestion du budget", "Travail en équipe", "Excel", "Gestion du stress"],
        "exp": ["Responsable logistique de {club} : salles, matériel et restauration",
                "Organisation d'un gala de 300 personnes : fournisseurs et inventaire",
                "Bénévole au Croissant-Rouge : gestion des stocks et distribution",
                "Gestion des imprévus le jour J d'un salon étudiant"],
    },
    "Projet": {
        "comp": ["Gestion de projet", "Planification", "Méthodes agiles", "Scrum", "Trello", "Notion",
                 "Jira", "Reporting", "Diagramme de Gantt"],
        "exp": ["Chef de projet de {club} : rétroplanning et suivi des tâches de 4 équipes",
                "Scrum master d'un projet étudiant : sprints, Jira et comptes rendus",
                "Stage PMO : tableaux de bord et reporting hebdomadaire",
                "Coordination d'un hackathon : planning et suivi des échéances"],
    },
    "Programme": {
        "comp": ["Organisation de conférences", "Prise de parole", "Animation", "Rédaction", "Anglais",
                 "Planification", "Contact des intervenants", "Modération de tables rondes"],
        "exp": ["Responsable programme de {club} : conférences, workshops et speakers",
                "Modératrice d'une table ronde sur l'emploi des jeunes ingénieurs",
                "Animation d'ateliers de formation pour les nouveaux membres",
                "Construction de l'agenda d'une journée scientifique"],
    },
    "Média": {
        "comp": ["Réseaux sociaux", "Community management", "Création de contenu", "Photographie",
                 "Montage vidéo", "Premiere Pro", "CapCut", "Rédaction", "Canva"],
        "exp": ["Community manager de {club} : Instagram, Facebook et LinkedIn",
                "Photographe officiel du Forum ENICarthage",
                "Montage des vidéos récapitulatives d'événements étudiants",
                "Création de contenu et stories pour une page de 10 000 abonnés"],
    },
}
CLUBS = ["IEEE ENICarthage", "Enactus ENICarthage", "JCI Carthage", "Microsoft Tech Club", "GDSC ENICarthage",
         "Club Robotique", "AIESEC Carthage", "Club Théâtre"]
HORS_SUJET = {
    "comp": ["Python", "Java", "Matlab", "SolidWorks", "Langage C", "Linux"],
    "exp": ["Projet académique : simulation numérique sous Matlab",
            "Stage ouvrier dans une usine de production",
            "Mini-projet : application de gestion de bibliothèque en Java"],
}


def construire_cv(rng, idx, comite, niveau):
    """niveau : fort | moyen | faible"""
    prenom, nom = PRENOMS[idx % len(PRENOMS)], NOMS[(idx * 7) % len(NOMS)]
    profil = PROFILS[comite]
    club = rng.choice(CLUBS)
    if niveau == "fort":
        comp = rng.sample(profil["comp"], 6) + ["Travail en équipe", "Leadership"]
        exp = [e.format(club=club) for e in rng.sample(profil["exp"], 3)]
        annee = rng.choice([3, 4])
        langues = "Arabe (maternelle), Français (courant), Anglais (B2)"
    elif niveau == "moyen":
        comp = rng.sample(profil["comp"], 3) + rng.sample(HORS_SUJET["comp"], 2)
        exp = [profil["exp"][0].format(club=club).replace("Responsable", "Membre").replace("Chef", "Membre"),
               rng.choice(HORS_SUJET["exp"])]
        annee = rng.choice([2, 3])
        langues = "Arabe, Français"
    else:
        comp = rng.sample(HORS_SUJET["comp"], 4)
        exp = rng.sample(HORS_SUJET["exp"], 2)
        annee = rng.choice([1, 2])
        langues = "Arabe, Français"
    return {
        "id": f"cv{idx + 1:02d}",
        "nom": f"{prenom} {nom}",
        "email": f"{prenom.lower()}.{nom.split()[-1].lower()}@exemple.tn",
        "telephone": f"+216 {rng.randint(20, 99)} {rng.randint(100, 999)} {rng.randint(100, 999)}",
        "comite_cible": comite,
        "niveau": niveau,
        "annee": annee,
        "filiere": rng.choice(FILIERES),
        "competences": comp,
        "experiences": exp,
        "langues": langues,
    }


def texte_cv(cv):
    lignes = [cv["nom"], f"{cv['email']} | {cv['telephone']} | Tunis",
              "PROFIL", f"Étudiant(e) en {cv['annee']}ème année {cv['filiere']} à l'ENICarthage.",
              "FORMATION", f"{2026 - cv['annee']} - présent : Cycle ingénieur, ENICarthage",
              "Baccalauréat mention Bien",
              "EXPÉRIENCES"] + [f"- {e}" for e in cv["experiences"]] + [
              "COMPÉTENCES", ", ".join(cv["competences"]),
              "LANGUES", cv["langues"]]
    return "\n".join(lignes)


def ecrire_pdf(cv, chemin):
    """Mise en page simple d'un CV d'une page."""
    c = canvas.Canvas(str(chemin), pagesize=A4)
    w, h = A4
    c.setFillColor(HexColor("#0B2A5B"))
    c.rect(0, h - 95, w, 95, fill=1, stroke=0)
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFont("Helvetica-Bold", 22)
    c.drawString(40, h - 50, cv["nom"])
    c.setFont("Helvetica", 10)
    c.drawString(40, h - 72, f"{cv['email']}   |   {cv['telephone']}   |   Tunis")
    y = h - 130

    def titre(t):
        nonlocal y
        c.setFillColor(HexColor("#C8102E"))
        c.setFont("Helvetica-Bold", 12)
        c.drawString(40, y, t)
        y -= 18
        c.setFillColor(HexColor("#1F2937"))
        c.setFont("Helvetica", 10)

    def ligne(t):
        nonlocal y
        c.drawString(50, y, t[:105])
        y -= 15

    titre("PROFIL")
    ligne(f"Étudiant(e) en {cv['annee']}ème année {cv['filiere']} à l'ENICarthage.")
    y -= 8
    titre("FORMATION")
    ligne(f"{2026 - cv['annee']} - présent : Cycle ingénieur, ENICarthage")
    ligne("Baccalauréat mention Bien")
    y -= 8
    titre("EXPÉRIENCES")
    for e in cv["experiences"]:
        ligne("• " + e)
    y -= 8
    titre("COMPÉTENCES")
    for morceau in textwrap.wrap(", ".join(cv["competences"]), 95):
        ligne(morceau)
    y -= 8
    titre("LANGUES")
    ligne(cv["langues"])
    c.save()


def main():
    rng = random.Random(2026)
    (DONNEES / "cvs").mkdir(parents=True, exist_ok=True)
    jeu, idx = [], 0
    for comite in PROFILS:
        for niveau in ["fort", "fort", "moyen", "moyen", "faible"]:
            cv = construire_cv(rng, idx, comite, niveau)
            cv["texte"] = texte_cv(cv)
            ecrire_pdf(cv, DONNEES / "cvs" / f"{cv['id']}.pdf")
            jeu.append(cv)
            idx += 1
    (DONNEES / "jeu_evaluation.json").write_text(json.dumps(jeu, ensure_ascii=False, indent=1), encoding="utf-8")

    # 6 CV de démo : un par comité, niveaux variés
    DEMO.mkdir(parents=True, exist_ok=True)
    choix = [0, 7, 11, 16, 23, 25]
    for i in choix:
        ecrire_pdf(jeu[i], DEMO / f"{jeu[i]['id']}.pdf")
    demo = [{k: jeu[i][k] for k in ("id", "nom", "email", "telephone", "comite_cible", "niveau", "annee",
                                    "competences", "experiences")} for i in choix]
    (DEMO / "candidats.json").write_text(json.dumps(demo, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(jeu)} CV d'évaluation, {len(choix)} CV de démo")


if __name__ == "__main__":
    main()
