// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Directly define your API base URL here instead of importing from environment
  private apiUrl = 'http://localhost:3000/api/v1'; // Adjust this to match your Rails API URL
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Check for existing token on page load
    const userData = localStorage.getItem('user');
    if (userData) {
      this.currentUserSubject.next(JSON.parse(userData));
    }
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    return localStorage.getItem('token');
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, { user: { email, password } })
      .pipe(
        tap((response: any) => this.handleAuthResponse(response))
      );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, { user: userData })
      .pipe(
        tap((response: any) => this.handleAuthResponse(response))
      );
  }

  logout(): void {
    // Even if the backend call fails, we want to clear local storage
    this.http.delete(`${this.apiUrl}/logout`).pipe(
      catchError(() => of(null))
    ).subscribe();
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private handleAuthResponse(response: any): void {
    if (response?.data) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      this.currentUserSubject.next(response.data.user);
    }
  }
}