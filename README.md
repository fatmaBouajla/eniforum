# EniForum

**EniForum** est une plateforme web permettant d'organiser le Forum Entreprises de l'ENICarthage.

Elle permet de gérer les utilisateurs, les comités, les tâches et les candidatures. Elle intègre également un module d'intelligence artificielle qui analyse les CV et aide à sélectionner les candidats.

## Technologies utilisées

- **Backend :** Spring Boot 3.2
- **Frontend :** Angular 17
- **Intelligence artificielle :** Python, FastAPI et Sentence Transformers
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

## 2. Architecture

Le projet contient quatre services principaux :

1. **Frontend :** interface utilisateur développée avec Angular.
2. **Backend :** gestion des fonctionnalités et des données avec Spring Boot.
3. **Base de données :** stockage des informations avec MySQL.
4. **Service IA :** analyse et comparaison des CV avec Python et FastAPI.

## 3. Lancer le projet avec Docker

### Prérequis

- Docker Desktop installé et démarré.
- Une connexion Internet.

### Étape 1 : Télécharger le projet

Ouvrir un terminal et exécuter :

```bash
mkdir eniforum
cd eniforum
curl.exe -fsSLO https://raw.githubusercontent.com/fatmaBouajla/eniforum/main/docker-compose.yml
```

### Étape 2 : Démarrer le projet

```bash
docker compose up -d
```

Docker télécharge et démarre automatiquement les différents services.

### Étape 3 : Accéder à l'application

Une fois les services démarrés :

| Service | Adresse |
|---|---|
| Application | http://localhost:4200 |
| API IA | http://localhost:8000/docs |

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

### Commandes Docker utiles

```bash
# Voir les services
docker compose ps

# Voir les logs
docker compose logs -f

# Arrêter le projet
docker compose down

# Arrêter et supprimer les données
docker compose down -v
```

## 4. Construire les images Docker

Pour télécharger le code source :

```bash
git clone https://github.com/fatmaBouajla/eniforum.git
cd eniforum
```

Pour construire les images et démarrer le projet :

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

Les images sont également disponibles sur Docker Hub :

- [Frontend](https://hub.docker.com/r/fatmabouajla/eniforum-frontend)
- [Backend](https://hub.docker.com/r/fatmabouajla/eniforum-backend)
- [Service IA](https://hub.docker.com/r/fatmabouajla/eniforum-ai)

Les images prennent en charge les architectures Intel/AMD et ARM.

## 5. Développement sans Docker

### Prérequis

- Java 17
- Maven
- Node.js 20
- Python 3.11
- MySQL 8

### Lancer le service IA

```bash
cd ai-service
python -m venv .venv
```

Sous Windows :

```powershell
.venv\Scripts\activate
```

Installer les dépendances :

```bash
pip install -r requirements.txt
python download_model.py
uvicorn main:app --port 8000
```

### Lancer le Backend

Dans un autre terminal :

```bash
cd backend
mvn spring-boot:run
```

### Lancer le Frontend

Dans un troisième terminal :

```bash
cd frontend
npm install
npm start
```

L'application sera disponible sur http://localhost:4200.

## 6. Tests

Pour tester les différentes parties du projet :

```bash
# Tests Backend
cd backend
mvn test
```

```bash
# Tests du service IA
cd ai-service
python -m pytest tests -q
```

## 7. Structure du projet

```text
eniforum/
│
├── backend/          # Spring Boot
├── frontend/         # Angular
├── ai-service/       # Service IA
├── docs/             # Documentation
│
├── docker-compose.yml
├── docker-compose.build.yml
└── .env.example
```

## 8. Sécurité

- Les mots de passe sont protégés avec BCrypt.
- L'authentification utilise JWT.
- Les utilisateurs ont des permissions selon leurs rôles.
- Les CV sont contrôlés avant leur traitement.
- Les conteneurs utilisent des utilisateurs non-root.
- Les fichiers contenant des mots de passe et les CV ne doivent pas être publiés sur GitHub.

## Auteurs

Projet réalisé à l'ENICarthage par :

- Fatma Bouajla
- Mayssa Abdouli
- Rawen Zgarni
