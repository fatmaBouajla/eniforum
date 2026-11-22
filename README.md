# EniForum

**EniForum** est une plateforme web permettant d'organiser le Forum Entreprises de l'ENICarthage.

Elle permet de gérer les utilisateurs, les comités, les tâches et les candidatures. Elle intègre également un module d'intelligence artificielle qui analyse les CV et aide à sélectionner les candidats.

## Technologies utilisées

- **Backend :** Spring Boot 3.2
- **Frontend :** Angular 17
- **Intelligence artificielle :** Python, FastAPI, Sentence Transformers et Ollama (Qwen2.5)
- **Base de données :** MySQL 8
- **Déploiement :** Docker

## 1. Fonctionnalités

| Rôle | Fonctionnalités |
|---|---|
| Administrateur | Gérer le forum et les utilisateurs |
| Comité de pilotage | Valider les candidatures et consulter les analyses IA |
| Coordinatrice | Gérer le planning et les tâches |
| Chef de comité | Gérer les membres et les tâches de son comité |
| Membre | Consulter et mettre à jour ses tâches |
| Candidat | Déposer son CV |

### Module IA

Le module IA permet de :
- Analyser les CV automatiquement.
- Comparer les compétences des candidats avec les besoins des postes.
- Donner un score de pertinence sur 100.
- Identifier les points forts et les compétences manquantes.
- Classer les candidats selon leur profil.
- Générer une analyse détaillée (points forts, manques et questions d'entretien) avec un modèle de langage local, à partir du CV et du guide de recrutement du comité (RAG).

## 2. Architecture

Le projet contient cinq services principaux :

1. **Frontend :** interface utilisateur développée avec Angular.
2. **Backend :** gestion des fonctionnalités et des données avec Spring Boot.
3. **Base de données :** stockage des informations avec MySQL.
4. **Service IA :** analyse et comparaison des CV avec Python et FastAPI.
5. **Ollama :** modèle de langage local utilisé pour l'analyse détaillée des CV.

**Compte administrateur :**

- Email : `admin@eniforum.tn`
- Mot de passe : `Admin@2026`

**Comptes de démonstration :**

Mot de passe commun : `Demo@2026`

| Rôle | Email |
|---|---|
| Comité de pilotage | `pilotage@eniforum.tn` |
| Coordinatrice | `coordinatrice@eniforum.tn` |
| Chef Design | `chef.design@eniforum.tn` |
| Chef Sponsoring | `chef.sponsoring@eniforum.tn` |
| Membre Design | `membre@eniforum.tn` |
| Membre Sponsoring | `membre2@eniforum.tn` |

Le projet contient également six candidatures de démonstration avec des CV PDF.



Projet réalisé à l'ENICarthage par :

- Fatma Bouajla
- Mayssa Abdouli
- Rawen Zgarni
