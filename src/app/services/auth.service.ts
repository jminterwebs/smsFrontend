// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/v1';
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
        
    // Load existing user data if available
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        this.currentUserSubject.next(JSON.parse(userData));
      } catch (e) {
        console.error('Failed to parse user data from localStorage:', e);
      }
    }
  }

  get isLoggedIn(): boolean {
    return !!this.currentUserSubject.value;
  }

  get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    const token = localStorage.getItem('token');
    console.log(`Token requested: ${token ? 'Found token' : 'No token in storage'}`);
    return token;
  }

  login(email: string, password: string): Observable<any> {
    console.log(`Attempting login for ${email}...`);
    
    return this.http.post(`${this.apiUrl}/login`, { user: { email, password } })
      .pipe(
        tap(response => {
          console.log('Raw login response:', response);
          this.handleAuthResponse(response);
        }),
        catchError(error => {
          console.error('Login failed:', error);
          return throwError(() => error);
        })
      );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, { user: userData })
      .pipe(
        tap(response => {
          console.log('Raw registration response:', response);
          this.handleAuthResponse(response);
        }),
        catchError(error => {
          console.error('Registration failed:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    // Even if the backend call fails, we want to clear local storage
    this.http.delete(`${this.apiUrl}/logout`).pipe(
      catchError(() => of(null))
    ).subscribe();
    
    // Test removing items from localStorage
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.log('✅ Successfully cleared localStorage during logout');
    } catch (e) {
      console.error('❌ Failed to clear localStorage during logout:', e);
    }
    
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  private handleAuthResponse(response: any): void {
    console.log('Handling auth response...');
    
    try {
      // Check different possible response structures
      let token: string | null = null;
      let userData: any = null;
      
      // Check response structure and extract token and user data
      if (response?.data?.token) {
        // Original expected structure
        token = response.data.token;
        userData = response.data.user;
        console.log('Found token in response.data.token');
      } else if (response?.token) {
        // Alternative: token at top level
        token = response.token;
        userData = response.user || response.data || {};
        console.log('Found token in response.token');
      } else if (response?.jwt) {
        // Alternative: JWT field instead of token
        token = response.jwt;
        userData = response.user || response.data || {};
        console.log('Found token in response.jwt');
      } else if (typeof response === 'string') {
        // Some APIs might return just the token as a string
        token = response;
        userData = {}; // Default empty user object
        console.log('Response is a string, assuming it is the token');
      } else {
        // Log the structure to help debug
        console.warn('Unknown response structure. Keys found:', Object.keys(response || {}));
        console.warn('Raw response:', response);
        return; // Exit if no recognizable structure
      }
      
      // Verify we have a token before proceeding
      if (!token) {
        console.error('No token found in response');
        return;
      }
      
      // Try to store in localStorage with error handling
      try {       
        // Explicitly write token value to console
        
        localStorage.setItem('token', token);
        
        // Verify token was stored
        const storedToken = localStorage.getItem('token');
     
        // Store user data
        if (userData) {
          const userJson = JSON.stringify(userData);
          localStorage.setItem('user', userJson);
          
          // Verify user data was stored
          const storedUserJson = localStorage.getItem('user');
     

          
          // Update state
          this.currentUserSubject.next(userData);
        }
      } catch (e) {
        console.error('❌ Failed to store auth data in localStorage:', e);
      }
    } catch (e) {
      console.error('❌ Error in handleAuthResponse:', e);
    }
  }
}