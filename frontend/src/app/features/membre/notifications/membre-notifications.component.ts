import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../../core/services/api.services';
import { Notification } from '../../../core/models';
import { ToastService } from '../../../core/services/toast.service';

/** Centre de notifications. */
@Component({
  selector: 'app-membre-notifications',
  template: `
    <app-layout title="Notifications" subtitle="Assignations, retards et décisions">
      <div class="alert alert-error" *ngIf="erreur"><lucide-icon name="circle-alert" [size]="18"></lucide-icon>{{ erreur }}</div>
      <div class="toolbar">
        <div class="segmented">
          <button class="seg-btn" [class.active]="!nonLues" (click)="nonLues = false">Toutes <span class="count">{{ notifications.length }}</span></button>
          <button class="seg-btn" [class.active]="nonLues" (click)="nonLues = true">Non lues <span class="count">{{ nbNonLues }}</span></button>
        </div>
        <span class="spacer"></span>
        <button class="btn btn-secondary btn-sm" (click)="toutLu()" [disabled]="!nbNonLues"><lucide-icon name="check" [size]="15"></lucide-icon> Tout marquer comme lu</button>
      </div>
      <div class="card">
        <div class="skeleton" style="height:200px;margin:16px" *ngIf="loading"></div>
        <div class="list" *ngIf="!loading && visibles.length">
          <button class="list-item notif" *ngFor="let n of visibles" [class.unread]="!n.lu" (click)="lire(n)">
            <span class="n-ico" [ngClass]="ton(n.type)"><lucide-icon [name]="icone(n.type)" [size]="16"></lucide-icon></span>
            <div class="grow"><div [class.strong]="!n.lu">{{ n.message }}</div><div class="muted small">{{ n.dateEnvoi | date:'EEEE d MMMM à HH:mm' }}</div></div>
            <span class="dot" *ngIf="!n.lu"></span>
          </button>
        </div>
        <app-empty *ngIf="!loading && !visibles.length" icon="bell" [title]="nonLues ? 'Aucune notification non lue' : 'Aucune notification'"></app-empty>
      </div>
    </app-layout>
  `,
  styles: [`
    .notif { width: 100%; border: 0; background: none; text-align: left; cursor: pointer; }
    .notif:hover { background: var(--surface-2); }
    .notif.unread { background: var(--brand-50); }
    .n-ico { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0; background: var(--brand-100); color: var(--brand); }
    .n-ico.red { background: var(--danger-bg); color: var(--danger); } .n-ico.green { background: var(--green-100); color: var(--green); }
  `],
})
export class MembreNotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  loading = true;
  erreur = '';
  nonLues = false;

  constructor(private notifs: NotificationService, private toast: ToastService) {}

  ngOnInit(): void {
    this.notifs.getMesNotifications().subscribe({
      next: n => { this.notifications = n.sort((a, b) => b.dateEnvoi.localeCompare(a.dateEnvoi)); this.loading = false; },
      error: (e: Error) => { this.erreur = e.message; this.loading = false; },
    });
  }

  get visibles(): Notification[] { return this.nonLues ? this.notifications.filter(n => !n.lu) : this.notifications; }
  get nbNonLues(): number { return this.notifications.filter(n => !n.lu).length; }

  lire(n: Notification): void {
    if (n.lu) return;
    this.notifs.marquerLu(n.id).subscribe({ next: () => n.lu = true, error: (e: Error) => this.toast.error(e.message) });
  }

  toutLu(): void {
    this.notifs.marquerToutLu().subscribe({
      next: () => { this.notifications.forEach(n => n.lu = true); this.toast.success('Notifications marquées comme lues'); },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  icone(type: string): string {
    return ({ TACHE_ASSIGNEE: 'list-todo', TACHE_EN_RETARD: 'clock', WORKSHOP_VALIDE: 'circle-check',
      WORKSHOP_REFUSE: 'circle-x', CANDIDATURE_MISE_A_JOUR: 'file-text' } as Record<string, string>)[type] ?? 'bell';
  }
  ton(type: string): string { return type === 'TACHE_EN_RETARD' || type === 'WORKSHOP_REFUSE' ? 'red' : type === 'WORKSHOP_VALIDE' ? 'green' : ''; }
}
