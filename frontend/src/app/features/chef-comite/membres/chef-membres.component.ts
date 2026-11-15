import { Component, OnInit } from '@angular/core';
import { CandidatureCVService, ComiteService } from '../../../core/services/api.services';
import { CandidatureCV, User } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';
import { lireAnalyse, lireDossier } from '../../../core/utils/analyse-ia';

/** Équipe du comité et demandes d'adhésion (candidatures « membre » du comité). */
@Component({
  selector: 'app-chef-membres',
  templateUrl: './chef-membres.component.html',
  styleUrls: ['./chef-membres.component.scss'],
})
export class ChefMembresComponent implements OnInit {
  membres: User[] = [];
  demandes: CandidatureCV[] = [];
  comiteId: number | null = null;
  comiteNom = '';
  loading = true;
  erreur = '';
  ouverte: CandidatureCV | null = null;
  aRetirer: User | null = null;
  decision: { c: CandidatureCV; mode: 'accepter' | 'refuser' } | null = null;

  constructor(private comites: ComiteService, private cvs: CandidatureCVService, private toast: ToastService) {}

  ngOnInit(): void { this.charger(); }

  charger(): void {
    this.comites.getMonComite().subscribe({
      next: c => {
        this.comiteId = c.id;
        this.comiteNom = c.nom;
        this.membres = c.membres ?? [];
        this.loading = false;
        // Le serveur ne renvoie au chef que les candidatures « membre » de son comité
        this.cvs.getAll().subscribe(l => this.demandes = l.filter(x => x.statut === 'EN_ATTENTE')
          .sort((a, b) => (lireAnalyse(b).score ?? -1) - (lireAnalyse(a).score ?? -1)));
      },
      error: () => { this.erreur = 'Vous n’êtes chef d’aucun comité pour le moment.'; this.loading = false; },
    });
  }

  retirer(): void {
    const m = this.aRetirer;
    this.aRetirer = null;
    if (!m || this.comiteId == null) return;
    this.comites.retirerMembre(this.comiteId, m.id).subscribe({
      next: c => { this.membres = c.membres ?? []; this.toast.success(`${m.nom} a été retiré(e) du comité`); },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  finDecision(c: CandidatureCV | null): void {
    this.decision = null;
    if (!c) return;
    this.ouverte = null;
    this.charger();
  }

  telecharger(c: CandidatureCV): void {
    this.cvs.telechargerCv(c.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `CV_${c.candidatNom.replace(/\s+/g, '_')}.pdf`; a.click();
        URL.revokeObjectURL(url);
      },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  score(c: CandidatureCV): number | null { return lireAnalyse(c).score; }
  dossier(c: CandidatureCV): Record<string, string> { return lireDossier(c.dossierComplet); }
  initiales(n: string): string { return (n || '?').split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2); }
}
