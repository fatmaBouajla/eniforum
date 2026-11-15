# Documentation

- [Cahier des charges v2.0 (PDF)](cahier-des-charges.pdf)
- Diagrammes (SVG) :
  - [Cas d'utilisation](diagrammes/cas-utilisation.svg)
  - [Classes](diagrammes/classes.svg)
  - [Séquence : dépôt, analyse IA et décision](diagrammes/sequence-candidature.svg)
  - [États d'une candidature](diagrammes/etats-candidature.svg)
  - [Traitement d'un CV par l'IA](diagrammes/traitement-ia.svg)
  - [Architecture logique](diagrammes/architecture.svg)
  - [Déploiement Docker](diagrammes/deploiement-docker.svg)
- [Prototype Figma](prototype-figma.txt)

Les sources des diagrammes sont dans [`diagrammes/sources`](diagrammes/sources) :
`.dot` (Graphviz : `dot -Tsvg fichier.dot -o fichier.svg`) et `.mmd`
(Mermaid : `npx @mermaid-js/mermaid-cli -c theme.json -i fichier.mmd -o fichier.svg`).
