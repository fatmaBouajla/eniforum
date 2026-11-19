import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, User } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = `${environment.apiUrl}/auth`;
  private userSubject = new BehaviorSubject<User | null>(this.storedUser());
  currentUser$ = this.userSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private storedUser(): User | null {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }

  login(req: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${this.api}/login`, req).pipe(
      switchMap(res => {
        localStorage.setItem('token', res.token);
        return this.http.get<User>(`${environment.apiUrl}/utilisateurs/me`);
      }),
      tap(user => {
        localStorage.setItem('user', JSON.stringify(user));
        this.userSubject.next(user);
      }),
    );
  }

  /** Vide la session sans changer de page. */
  clearSession(): void {
    localStorage.clear();
    this.userSubject.next(null);
  }

  logout(): void {
    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  redirectByRole(): void {
    const map: Record<string, string> = {
      ADMIN: '/admin/dashboard',
      COMITE_PILOTAGE: '/pilotage/dashboard',
      COORDINATRICE: '/coordinatrice/dashboard',
      CHEF_COMITE: '/chef-comite/dashboard',
      MEMBRE: '/membre/dashboard',
    };
    this.router.navigate([map[this.currentUser?.role ?? ''] ?? '/auth/login']);
  }
}
