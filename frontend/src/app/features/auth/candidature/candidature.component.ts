import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { iconeComite } from '../../../shared/icons';

type Poste = 'MEMBRE' | 'CHEF_COMITE';

/** Formulaire public de candidature (membre ou chef de comité, selon la route). */
@Component({
  selector: 'app-candidature',
  templateUrl: './candidature.component.html',
  styleUrls: ['./candidature.component.scss'],
})
export class CandidatureComponent implements OnInit {
  poste: Poste = 'MEMBRE';
  form!: FormGroup;
  cv: File | null = null;
  cvErreur = '';
  survol = false;
  envoi = false;
  erreur = '';
  envoye = false;

  readonly comites = ['Sponsoring', 'Design', 'Logistique', 'Projet', 'Programme', 'Média'];

  constructor(private fb: FormBuilder, private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.poste = this.route.snapshot.data['poste'] ?? 'MEMBRE';
    const chef = this.estChef;
    this.form = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^(\+216)?\s?\d{2}\s?\d{3}\s?\d{3}$/)]],
      niveauEtudes: ['', Validators.required],
      comite: ['', Validators.required],
      motivation: ['', [Validators.required, Validators.minLength(chef ? 80 : 40)]],
      experience: [''],
      competences: [''],
      consentement: [false, Validators.requiredTrue],
    });
    // Pré-remplissage depuis le lien (?comite=Design&email=…)
    const q = this.route.snapshot.queryParamMap;
    if (q.get('comite') && this.comites.includes(q.get('comite')!)) this.form.patchValue({ comite: q.get('comite') });
    if (q.get('email')) this.form.patchValue({ email: q.get('email') });
  }

  get estChef(): boolean { return this.poste === 'CHEF_COMITE'; }
  get niveaux(): number[] { return this.estChef ? [3, 4, 5] : [1, 2, 3, 4, 5]; }
  get f() { return this.form.controls; }
  icone(c: string): string { return iconeComite(c); }
  invalide(nom: string): boolean { return this.f[nom].touched && this.f[nom].invalid; }

  // ---- CV ----
  choisir(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.verifierCv(input.files?.[0] ?? null);
    input.value = '';
  }

  deposer(event: DragEvent): void {
    event.preventDefault();
    this.survol = false;
    this.verifierCv(event.dataTransfer?.files?.[0] ?? null);
  }

  private verifierCv(f: File | null): void {
    this.cvErreur = '';
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) { this.cvErreur = 'Le CV doit être un fichier PDF.'; return; }
    if (f.size > 10 * 1024 * 1024) { this.cvErreur = 'Le CV ne doit pas dépasser 10 Mo.'; return; }
    this.cv = f;
  }

  taille(octets: number): string { return octets > 1048576 ? (octets / 1048576).toFixed(1) + ' Mo' : Math.round(octets / 1024) + ' Ko'; }

  // ---- Envoi ----
  envoyer(): void {
    this.form.markAllAsTouched();
    if (!this.cv) this.cvErreur = 'Le CV est obligatoire.';
    if (this.form.invalid || !this.cv) return;
    this.envoi = true;
    this.erreur = '';
    const v = this.form.value;
    const tel = '+216' + String(v.telephone).replace(/\D/g, '').slice(-8);
    const fd = new FormData();
    fd.append('prenom', v.prenom.trim());
    fd.append('nom', v.nom.trim());
    fd.append('email', v.email.trim());
    fd.append('telephone', tel);
    fd.append('niveauEtudes', String(v.niveauEtudes));
    fd.append('comiteSouhaite', v.comite);
    fd.append('posteVise', this.poste);
    fd.append('motivation', v.motivation.trim());
    fd.append('experience', (v.experience || '').trim());
    fd.append('competences', (v.competences || '').trim());
    fd.append('cv', this.cv, this.cv.name);
    this.http.post(`${environment.apiUrl}/candidatures`, fd).subscribe({
      next: () => { this.envoi = false; this.envoye = true; window.scrollTo({ top: 0 }); },
      error: (e: Error) => { this.envoi = false; this.erreur = e.message || 'Envoi impossible, réessayez.'; },
    });
  }
}
