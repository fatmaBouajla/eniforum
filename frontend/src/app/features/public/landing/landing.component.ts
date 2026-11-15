import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { iconeComite } from '../../../shared/icons';

/** Page d'accueil publique. */
@Component({
  selector: 'app-landing',
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
})
export class LandingComponent {
  readonly annee = new Date().getFullYear();
  readonly comites = [
    { nom: 'Sponsoring', desc: 'Prospecter les entreprises, négocier les partenariats et suivre les sponsors.' },
    { nom: 'Design', desc: 'Créer l’identité visuelle : affiches, badges, supports imprimés et réseaux sociaux.' },
    { nom: 'Logistique', desc: 'Préparer les salles, les stands, le matériel et le déroulement du jour J.' },
    { nom: 'Projet', desc: 'Piloter le planning global, suivre les tâches et tenir les échéances.' },
    { nom: 'Programme', desc: 'Construire les conférences et workshops, accueillir les intervenants.' },
    { nom: 'Média', desc: 'Animer les réseaux sociaux, couvrir l’événement en photo et en vidéo.' },
  ];
  readonly etapes = [
    { icon: 'upload', titre: 'Déposez votre candidature', texte: 'Choisissez un comité, présentez votre motivation et joignez votre CV en PDF.' },
    { icon: 'sparkles', titre: 'Analyse assistée par IA', texte: 'Votre CV est comparé à la fiche du poste. Le score est expliqué, jamais décisif à lui seul.' },
    { icon: 'mail', titre: 'Réponse du comité', texte: 'Le comité de pilotage décide. En cas d’acceptation, vous recevez vos accès par email.' },
  ];
  readonly roles = [
    { icon: 'shield-check', titre: 'Administration', texte: 'Édition du Forum, comptes, comités et historique.' },
    { icon: 'gauge', titre: 'Comité de pilotage', texte: 'Supervision, candidatures, module IA et rapports.' },
    { icon: 'calendar-clock', titre: 'Coordination', texte: 'Tâches de tous les comités, workshops et planning.' },
    { icon: 'crown', titre: 'Chefs de comité', texte: 'Équipe, tâches internes et propositions de workshops.' },
    { icon: 'user-check', titre: 'Membres', texte: 'Tâches assignées, avancement et notifications.' },
  ];

  constructor(public auth: AuthService) {}

  icone(nom: string): string { return iconeComite(nom); }
}
