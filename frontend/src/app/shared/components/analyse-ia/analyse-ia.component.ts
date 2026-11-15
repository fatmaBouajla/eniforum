import { Component, Input, OnChanges } from '@angular/core';
import { CandidatureCV } from '../../../core/models';
import { AnalyseIA, RECO_LABELS, lireAnalyse } from '../../../core/utils/analyse-ia';

/** Affichage complet d'une analyse IA : recommandation, détail du score, points forts,
 *  compétences trouvées / manquantes, points à vérifier. */
@Component({
  selector: 'app-analyse-ia',
  templateUrl: './analyse-ia.component.html',
  styleUrls: ['./analyse-ia.component.scss'],
})
export class AnalyseIaComponent implements OnChanges {
  @Input() candidature!: CandidatureCV;
  @Input() compact = false;
  a!: AnalyseIA;
  readonly labels = RECO_LABELS;
  readonly messageNonAnalyse = "Lancez l'analyse pour obtenir un score et une justification.";

  ngOnChanges(): void {
    this.a = lireAnalyse(this.candidature);
  }

  barTone(pct: number): string {
    return pct >= 70 ? 'high' : pct >= 45 ? 'mid' : 'low';
  }
}
