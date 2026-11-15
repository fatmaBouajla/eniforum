import { Component, OnInit } from '@angular/core';
import { CandidatureCVService } from '../../../core/services/api.services';
import { CandidatureCV } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { libellePoste, lireAnalyse, lireDossier } from '../../../core/utils/analyse-ia';

interface Ligne { c: CandidatureCV; comite: string; poste: string; score: number | null; dossier: Record<string, string>; }

/** Liste des candidatures déposées, avec fiche détaillée et décision. */
@Component({
  selector: 'app-candidatures-cv',
  templateUrl: './candidatures-cv.component.html',
  styleUrls: ['./candidatures-cv.component.scss'],
})
export class CandidaturesCVComponent implements OnInit {
  lignes: Ligne[] = [];
  loading = true;
  erreur = '';
  filtre = 'EN_ATTENTE';
  recherche = '';
  ouverte: Ligne | null = null;
  analyse = false;
  decision: { c: CandidatureCV; mode: 'accepter' | 'refuser' } | null = null;
  readonly filtres = [
    { cle: 'EN_ATTENTE', libelle: 'En attente' }, { cle: 'ACCEPTE', libelle: 'Acceptées' },
    { cle: 'REFUSE', libelle: 'Refusées' }, { cle: '', libelle: 'Toutes' },
  ];
  // Champs du formulaire affichés dans la fiche
  readonly champs = ['Tel', 'Niveau', 'Comité', 'Motivation', 'Expérience', 'Compétences'];

  constructor(private cvs: CandidatureCVService, private toast: ToastService) {}

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.cvs.getAll().subscribe({
      next: l => {
        this.lignes = l.map(c => this.versLigne(c)).sort((a, b) => (b.c.dateDepot ?? '').localeCompare(a.c.dateDepot ?? ''));
        this.loading = false;
      },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  private versLigne(c: CandidatureCV): Ligne {
    const dossier = lireDossier(c.dossierComplet);
    return { c, dossier, comite: dossier['Comité'] ?? '—', poste: libellePoste(c.posteVise), score: lireAnalyse(c).score };
  }

  get visibles(): Ligne[] {
    const q = this.recherche.trim().toLowerCase();
    return this.lignes.filter(l => (!this.filtre || l.c.statut === this.filtre) &&
      (!q || l.c.candidatNom.toLowerCase().includes(q) || (l.c.candidatEmail ?? '').toLowerCase().includes(q) || l.comite.toLowerCase().includes(q)));
  }

  nombre(statut: string): number { return statut ? this.lignes.filter(l => l.c.statut === statut).length : this.lignes.length; }

  relancerAnalyse(l: Ligne): void {
    this.analyse = true;
    this.cvs.analyserIA(l.c.id).subscribe({
      next: c => { this.analyse = false; this.remplacer(c); this.toast.success('Analyse IA mise à jour'); },
      error: (e: Error) => { this.analyse = false; this.toast.error(e.message); },
    });
  }

  telecharger(l: Ligne): void {
    this.cvs.telechargerCv(l.c.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CV_${l.c.candidatNom.replace(/\s+/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  finDecision(c: CandidatureCV | null): void {
    this.decision = null;
    if (c) this.remplacer(c);
  }

  private remplacer(c: CandidatureCV): void {
    const i = this.lignes.findIndex(l => l.c.id === c.id);
    if (i < 0) return;
    this.lignes[i] = this.versLigne({ ...this.lignes[i].c, ...c });
    if (this.ouverte?.c.id === c.id) this.ouverte = this.lignes[i];
  }

  initiale(n: string): string { return (n || '?').charAt(0).toUpperCase(); }
}
