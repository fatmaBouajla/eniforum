"""Client du modèle de langage local (Ollama)."""
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request
from typing import Optional

log = logging.getLogger("cv-ai")


class ClientOllama:
    def __init__(self):
        self.url = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
        self.modele = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
        self.delai = float(os.getenv("OLLAMA_TIMEOUT", "240"))
        self.statut = "non démarré"

    def _appel(self, chemin: str, corps: Optional[dict] = None, delai: float = 10) -> dict:
        data = json.dumps(corps).encode() if corps is not None else None
        req = urllib.request.Request(self.url + chemin, data=data, method="POST" if data else "GET",
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=delai) as r:
            return json.loads(r.read() or b"{}")

    def preparer_async(self) -> None:
        if os.getenv("OLLAMA_DISABLE", "").lower() in ("1", "true", "yes"):
            self.statut = "désactivé"
            return
        threading.Thread(target=self._preparer, daemon=True).start()

    def _preparer(self) -> None:
        """Télécharge le modèle au premier lancement (une seule fois, il reste dans le volume)."""
        for _ in range(30):  # Ollama peut démarrer après ce service
            try:
                noms = [m.get("name", "") for m in self._appel("/api/tags").get("models", [])]
                if not any(n == self.modele or n.startswith(self.modele + ":") for n in noms):
                    self.statut = "téléchargement du modèle"
                    log.info("Téléchargement du modèle %s…", self.modele)
                    self._appel("/api/pull", {"model": self.modele, "stream": False}, delai=3600)
                self.statut = "prêt"
                log.info("Modèle de langage prêt : %s", self.modele)
                return
            except (urllib.error.URLError, OSError, ValueError) as exc:
                self.statut = "indisponible"
                log.info("Ollama pas encore joignable (%s), nouvel essai dans 10 s", exc)
                time.sleep(10)
        log.warning("Ollama indisponible : analyse détaillée désactivée")

    @property
    def pret(self) -> bool:
        return self.statut == "prêt"

    def generer_json(self, prompt: str) -> dict:
        r = self._appel("/api/generate", {
            "model": self.modele, "prompt": prompt, "format": "json", "stream": False,
            "options": {"temperature": 0.1, "num_ctx": 4096, "num_predict": 700},
        }, delai=self.delai)
        return json.loads(r.get("response") or "{}")
