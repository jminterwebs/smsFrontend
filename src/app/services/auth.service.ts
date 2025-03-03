// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/v1`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    console.log('AuthService initialized, API URL:', this.apiUrl);
    
    // Load existing user data if available
    try {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      
      console.log(`On init - Token: ${token ? 'Found' : 'Not found'}, User data: ${userData ? 'Found' : 'Not found'}`);
      
      if (userData && token) {
        try {
          this.currentUserSubject.next(JSON.parse(userData));
          console.log('Successfully loaded user from localStorage on init');
        } catch (e) {
          console.error('Failed to parse user data from localStorage:', e);
          // Clear potentially corrupt data
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } else if (!token && userData) {
        console.warn('Found user data but no token - clearing user data for consistency');
        localStorage.removeItem('user');
      }
    } catch (e) {
      console.error('Error during AuthService initialization:', e);
    }
  }

  get isLoggedIn(): boolean {
    const isLoggedIn = !!this.currentUserSubject.value && !!this.token;
    console.log(`isLoggedIn check: ${isLoggedIn}`);
    return isLoggedIn;
  }

  get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    try {
      const token = localStorage.getItem('token');
      console.log(`Token requested: ${token ? 'Found token' : 'No token in storage'}`);
      return token;
    } catch (e) {
      console.error('Error retrieving token from localStorage:', e);
      return null;
    }
  }

  login(email: string, password: string): Observable<any> {
    console.log(`Attempting login for ${email} to ${this.apiUrl}/login...`);
    
    return this.http.post(`${this.apiUrl}/login`, { user: { email, password } })
      .pipe(
        tap(response => {
          console.log('Login successful. Response type:', typeof response);
          if (typeof response === 'object') {
            console.log('Response keys:', Object.keys(response || {}));
          }
          this.handleAuthResponse(response);
        }),
        catchError(error => {
          console.error('Login failed:', error);
          console.error('Error status:', error.status, 'Error message:', error.message);
          console.error('Error response:', error.error);
          return throwError(() => error);
        })
      );
  }

  register(userData: any): Observable<any> {
    console.log(`Attempting registration to ${this.apiUrl}/signup...`);
    
    return this.http.post(`${this.apiUrl}/signup`, { user: userData })
      .pipe(
        tap(response => {
          console.log('Registration successful. Response type:', typeof response);
          if (typeof response === 'object') {
            console.log('Response keys:', Object.keys(response || {}));
          }
          this.handleAuthResponse(response);
        }),
        catchError(error => {
          console.error('Registration failed:', error);
          console.error('Error status:', error.status, 'Error message:', error.message);
          console.error('Error response:', error.error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    console.log('Logout initiated');
    
    // Even if the backend call fails, we want to clear local storage
    this.http.delete(`${this.apiUrl}/logout`).pipe(
      tap(() => console.log('Logout API call successful')),
      catchError((error) => {
        console.error('Logout API call failed:', error);
        return of(null);
      })
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
        console.warn('Raw response:', JSON.stringify(response));
        return; // Exit if no recognizable structure
      }
      
      // Verify we have a token before proceeding
      if (!token) {
        console.error('No token found in response');
        return;
      }
      
      // Try to store in localStorage with error handling
      try {       
        // Explicitly write token value to console (only show beginning for security)
        console.log('About to store token:', token.substring(0, 10) + '...');
        
        localStorage.setItem('token', token);
        
        // Verify token was stored with explicit logging
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          console.log('✅ Token successfully stored in localStorage');
          console.log('Stored token length:', storedToken.length);
        } else {
          console.error('❌ Token was set but cannot be retrieved from localStorage');
        }
     
        // Store user data with better verification
        if (userData) {
          const userJson = JSON.stringify(userData);
          console.log('About to store user data, object keys:', Object.keys(userData));
          
          localStorage.setItem('user', userJson);
          
          // Verify user data was stored
          const storedUserJson = localStorage.getItem('user');
          if (storedUserJson) {
            console.log('✅ User data successfully stored in localStorage');
            
            // Update BehaviorSubject with user data
            this.currentUserSubject.next(userData);
            console.log('✅ Updated currentUserSubject with user data');
          } else {
            console.error('❌ User data was set but cannot be retrieved from localStorage');
          }
        } else {
          console.warn('No user data available to store');
        }
      } catch (e) {
        console.error('❌ Failed to store auth data in localStorage:', e);
        // Add more details about the error
        
      }
    } catch (e) {
      console.error('❌ Error in handleAuthResponse:');
    }
  }
}