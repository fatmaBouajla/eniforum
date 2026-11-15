import { Injectable } from '@angular/core';

export interface Toast { id: number; type: 'success' | 'error' | 'info'; message: string; }

/** Messages courts en bas de l'écran (succès, erreur). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts: Toast[] = [];
  private seq = 0;

  success(message: string): void { this.ajouter('success', message); }
  error(message: string): void { this.ajouter('error', message, 6000); }
  info(message: string): void { this.ajouter('info', message); }

  fermer(id: number): void { this.toasts = this.toasts.filter(t => t.id !== id); }

  private ajouter(type: Toast['type'], message: string, duree = 3500): void {
    const id = ++this.seq;
    this.toasts = [...this.toasts, { id, type, message }];
    setTimeout(() => this.fermer(id), duree);
  }
}
