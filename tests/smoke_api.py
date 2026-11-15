"""Test rapide de l'API sur une instance lancée avec les données de démo.

Usage : python tests/smoke_api.py [http://localhost:8081/api]
Vérifie les rôles, les droits et le parcours candidature -> analyse IA -> acceptation.
"""
import json
import sys
import urllib.error
import urllib.request

API = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8081/api"
OK, KO = 0, 0


def appel(methode, chemin, token=None, corps=None):
    req = urllib.request.Request(API + chemin, method=methode)
    if token:
        req.add_header("Authorization", "Bearer " + token)
    data = None
    if corps is not None:
        data = json.dumps(corps).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data, timeout=120) as r:
            txt = r.read().decode()
            return r.status, (json.loads(txt) if txt else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try:
            return e.code, json.loads(txt)
        except ValueError:
            return e.code, txt


def verifier(nom, condition):
    global OK, KO
    OK, KO = (OK + 1, KO) if condition else (OK, KO + 1)
    print(("  ✔ " if condition else "  ✘ ") + nom)


def connexion(email, mdp):
    code, r = appel("POST", "/auth/login", corps={"email": email, "motDePasse": mdp})
    return r["token"] if code == 200 else None


print("Connexion par rôle")
comptes = {
    "ADMIN": ("admin@eniforum.tn", "Admin@2026"),
    "COMITE_PILOTAGE": ("pilotage@eniforum.tn", "Demo@2026"),
    "COORDINATRICE": ("coordinatrice@eniforum.tn", "Demo@2026"),
    "CHEF_COMITE": ("chef.design@eniforum.tn", "Demo@2026"),
    "MEMBRE": ("membre@eniforum.tn", "Demo@2026"),
}
jetons = {}
for role, (email, mdp) in comptes.items():
    jetons[role] = connexion(email, mdp)
    code, me = appel("GET", "/utilisateurs/me", jetons[role])
    verifier(f"{role} : connexion et rôle correct", code == 200 and me["role"] == role)
    verifier(f"{role} : mot de passe absent de la réponse", "motDePasse" not in me)
verifier("Mauvais mot de passe refusé", connexion("admin@eniforum.tn", "faux") is None)

print("Données de base")
code, comites = appel("GET", "/comites", jetons["ADMIN"])
verifier("6 comités créés", code == 200 and len(comites) == 6)
verifier("Aucun mot de passe dans les comités", "motDePasse" not in json.dumps(comites))
code, forums = appel("GET", "/forum-projects", jetons["ADMIN"])
verifier("Une édition du Forum existe", code == 200 and len(forums) >= 1)

print("Droits")
code, _ = appel("GET", "/utilisateurs", jetons["MEMBRE"])
verifier("Un membre ne liste pas les utilisateurs (403)", code == 403)
code, cands_chef = appel("GET", "/candidatures", jetons["CHEF_COMITE"])
code2, cands = appel("GET", "/candidatures", jetons["COMITE_PILOTAGE"])
verifier("Le chef Design ne voit que les candidatures membres Design",
         code == 200 and 1 <= len(cands_chef) < len(cands)
         and all("Design" in c["dossierComplet"] and c["posteVise"] == "MEMBRE" for c in cands_chef))
autre = next(c for c in cands if "Design" not in c["dossierComplet"])
code, _ = appel("PUT", f"/candidatures/{autre['id']}/accepter", jetons["CHEF_COMITE"])
verifier("Le chef ne peut pas accepter une candidature d'un autre comité (403)", code == 403)

print("Routes ajoutées")
design = next(c for c in comites if c["nom"] == "Design")
code, r = appel("PUT", f"/comites/{design['id']}", jetons["ADMIN"],
                {"nom": "Design", "description": "Identité visuelle du Forum"})
verifier("Modifier un comité (PUT /comites/{id})", code == 200 and r["chef"] is not None)
code, ws = appel("GET", "/workshops", jetons["CHEF_COMITE"])
propose = next(w for w in ws if w["statut"] == "PROPOSE")
code, r = appel("PUT", f"/workshops/{propose['id']}", jetons["CHEF_COMITE"], {"titre": "Initiation à Figma (2h)"})
verifier("Le chef modifie son workshop proposé", code == 200 and r["titre"] == "Initiation à Figma (2h)")

print("Tâches")
code, taches = appel("GET", "/taches/mes-taches", jetons["MEMBRE"])
verifier("Le membre voit ses tâches", code == 200 and len(taches) >= 1)
code, _ = appel("PUT", f"/taches/{taches[0]['id']}/statut?statut=TERMINEE", jetons["MEMBRE"])
verifier("Le membre change le statut de sa tâche", code == 200)
code, stats = appel("GET", "/stats/kpis", jetons["COMITE_PILOTAGE"])
verifier("Statistiques disponibles", code == 200 and stats["totalTaches"] >= 6)

print("Candidature -> IA -> acceptation")
cible = next(c for c in cands if c["statut"] == "EN_ATTENTE")
code, analyse = appel("POST", f"/candidatures/{cible['id']}/analyser-ia", jetons["COMITE_PILOTAGE"])
verifier("Analyse IA : score réel", code == 200 and analyse["scoreIA"] is not None)
verifier("Analyse IA : justification structurée", code == 200 and analyse["justificationIA"].startswith("Recommandation"))
code, acc = appel("PUT", f"/candidatures/{cible['id']}/accepter", jetons["COMITE_PILOTAGE"])
verifier("Acceptation", code == 200 and acc["statut"] == "ACCEPTE")
mdp = acc.get("motDePasseProvisoire")
verifier("Sans email configuré : mot de passe provisoire affiché", bool(mdp))
nouveau = connexion(cible["candidatEmail"], mdp) if mdp else None
verifier("Le candidat accepté peut se connecter", nouveau is not None)
code, _ = appel("PUT", f"/candidatures/{cible['id']}/accepter", jetons["COMITE_PILOTAGE"])
verifier("Double acceptation refusée (409)", code == 409)
if nouveau:
    code, _ = appel("PUT", "/utilisateurs/me/mot-de-passe", nouveau,
                    {"ancienMotDePasse": mdp, "nouveauMotDePasse": "NouveauMdp2026"})
    verifier("Changement de mot de passe", code == 204)

print("Périmètre du chef de comité")
_, comites = appel("GET", "/comites", jetons["ADMIN"])
autre = next(c["id"] for c in comites if c["nom"] == "Sponsoring")
code, _ = appel("POST", "/taches", jetons["CHEF_COMITE"], {"titre": "Hors périmètre", "comiteId": autre,
                "dateDebut": "2026-12-01", "dateFin": "2026-12-05", "priorite": "NORMALE"})
verifier("Tâche pour un autre comité refusée (403)", code == 403)
code, _ = appel("POST", "/workshops", jetons["CHEF_COMITE"], {"titre": "Hors périmètre", "comite": {"id": autre},
                "dateHeure": "2026-12-20T10:00:00"})
verifier("Workshop pour un autre comité refusé (403)", code == 403)

print(f"\n{OK} réussis, {KO} échoués")
sys.exit(1 if KO else 0)
