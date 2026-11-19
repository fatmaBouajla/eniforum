import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ForumProject, Comite, Tache, Workshop,
  CandidatureCV, Notification, KPIs, AvancementComite
} from '../models';

const API = environment.apiUrl;

@Injectable({ providedIn: 'root' })
export class ForumProjectService {
  private url = `${API}/forum-projects`;
  constructor(private http: HttpClient) {}
  getCurrent(): Observable<ForumProject> { return this.http.get<ForumProject>(`${this.url}/current`); }
}

@Injectable({ providedIn: 'root' })
export class ComiteService {
  private url = `${API}/comites`;
  constructor(private http: HttpClient) {}
  getAll(): Observable<Comite[]> { return this.http.get<Comite[]>(this.url); }

  /** Comité dont l'utilisateur connecté est le chef. */
  getMonComite(): Observable<Comite> { return this.http.get<Comite>(`${this.url}/mon-comite`); }

  retirerMembre(comiteId: number, membreId: number): Observable<Comite> {
    return this.http.delete<Comite>(`${this.url}/${comiteId}/membres`, {
      params: { utilisateurId: membreId.toString() }
    });
  }
}

@Injectable({ providedIn: 'root' })
export class TacheService {
  private url = `${API}/taches`;
  constructor(private http: HttpClient) {}

  /** Le serveur filtre selon le rôle (un chef ne reçoit que son comité). */
  getAll(statut?: string): Observable<Tache[]> {
    return this.http.get<Tache[]>(this.url, statut ? { params: { statut } } : {});
  }

  getMesTaches(): Observable<Tache[]> { return this.http.get<Tache[]>(`${this.url}/mes-taches`); }

  changerStatut(id: number, statut: string): Observable<Tache> {
    return this.http.put<Tache>(`${this.url}/${id}/statut`, null, { params: { statut } });
  }
}

@Injectable({ providedIn: 'root' })
export class WorkshopService {
  private url = `${API}/workshops`;
  constructor(private http: HttpClient) {}
  getAll(): Observable<Workshop[]> { return this.http.get<Workshop[]>(this.url); }
}

@Injectable({ providedIn: 'root' })
export class CandidatureCVService {
  private url = `${API}/candidatures`;
  constructor(private http: HttpClient) {}
  getAll(): Observable<CandidatureCV[]> { return this.http.get<CandidatureCV[]>(this.url); }
  getById(id: number): Observable<CandidatureCV> { return this.http.get<CandidatureCV>(`${this.url}/${id}`); }

  telechargerCv(id: number): Observable<Blob> {
    return this.http.get(`${this.url}/${id}/telecharger-cv`, { responseType: 'blob' });
  }

  accepter(id: number): Observable<CandidatureCV> {
    return this.http.put<CandidatureCV>(`${this.url}/${id}/accepter`, {});
  }

  refuser(id: number, commentaire: string): Observable<CandidatureCV> {
    return this.http.put<CandidatureCV>(`${this.url}/${id}/refuser`, null, { params: { commentaire } });
  }

  analyserIA(id: number): Observable<CandidatureCV> {
    return this.http.post<CandidatureCV>(`${this.url}/${id}/analyser-ia`, {});
  }

  analyseDetaillee(id: number): Observable<CandidatureCV> {
    return this.http.post<CandidatureCV>(`${this.url}/${id}/analyse-detaillee`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private url = `${API}/notifications`;
  constructor(private http: HttpClient) {}

  getMesNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.url}/mes-notifications`);
  }
  getNonLues(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.url}/non-lues`);
  }
  marquerLu(id: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.url}/${id}/lu`, {});
  }
  marquerToutLu(): Observable<void> {
    return this.http.patch<void>(`${this.url}/tout-lu`, {});
  }
}

@Injectable({ providedIn: 'root' })
export class StatistiquesService {
  private url = `${API}/stats`;
  constructor(private http: HttpClient) {}
  getKPIs(): Observable<KPIs> { return this.http.get<KPIs>(`${this.url}/kpis`); }
  getAvancementComites(): Observable<AvancementComite[]> {
    return this.http.get<AvancementComite[]>(`${this.url}/comites`);
  }
}
