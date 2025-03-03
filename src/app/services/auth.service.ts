// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of, tap, throwError, timer } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/v1`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Add token expiry tracking
  private tokenExpiryTime: number | null = null;
  private tokenRefreshInterval: any;

  constructor(private http: HttpClient, private router: Router) {
    console.log('AuthService initialized, API URL:', this.apiUrl);
    
    // Load existing user data if available
    this.loadUserFromStorage();
    
    // Set up token refresh mechanism - check every minute
    this.setupTokenRefresh();
  }

  private loadUserFromStorage(): void {
    try {
      const userData = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      // Also try from sessionStorage as backup
      const sessionToken = sessionStorage.getItem('token');
      const sessionUserData = sessionStorage.getItem('user');
      
      console.log(`Init - Token: ${token ? 'Found in localStorage' : (sessionToken ? 'Found in sessionStorage' : 'Not found')}`);
      
      // Use localStorage data if available, otherwise try sessionStorage
      if (userData && token) {
        try {
          this.currentUserSubject.next(JSON.parse(userData));
          console.log('Successfully loaded user from localStorage');
          
          // Also store in sessionStorage as backup
          sessionStorage.setItem('token', token);
          sessionStorage.setItem('user', userData);
        } catch (e) {
          console.error('Failed to parse user data from localStorage:', e);
          // Clear potentially corrupt data
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } else if (sessionUserData && sessionToken) {
        // Try to restore from sessionStorage and back to localStorage
        try {
          this.currentUserSubject.next(JSON.parse(sessionUserData));
          console.log('Restored user from sessionStorage');
          
          // Restore to localStorage
          localStorage.setItem('token', sessionToken);
          localStorage.setItem('user', sessionUserData);
        } catch (e) {
          console.error('Failed to restore from sessionStorage:', e);
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('token');
        }
      } else if (!token && userData) {
        console.warn('Found user data but no token - clearing user data for consistency');
        localStorage.removeItem('user');
      }
    } catch (e) {
      console.error('Error during AuthService initialization:', e);
    }
  }

  private setupTokenRefresh(): void {
    // Clear any existing interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    
    // Check token validity every minute
    this.tokenRefreshInterval = setInterval(() => {
      if (this.isLoggedIn) {
        // If we detect localStorage was cleared but we have session data
        if (!localStorage.getItem('token') && sessionStorage.getItem('token')) {
          console.warn('localStorage token missing! Restoring from sessionStorage');
          localStorage.setItem('token', sessionStorage.getItem('token')!);
          localStorage.setItem('user', sessionStorage.getItem('user')!);
        }
        
        // Optionally implement token refresh logic here
        // this.refreshToken();
      }
    }, 60000); // Check every minute
  }

  get isLoggedIn(): boolean {
    // Check both localStorage and sessionStorage
    const localToken = localStorage.getItem('token');
    const sessionToken = sessionStorage.getItem('token');
    
    const isLoggedIn = !!this.currentUserSubject.value && !!(localToken || sessionToken);
    console.log(`isLoggedIn check: ${isLoggedIn}`);
    return isLoggedIn;
  }

  get currentUserValue(): any {
    return this.currentUserSubject.value;
  }

  get token(): string | null {
    try {
      // Try localStorage first, then sessionStorage as fallback
      let token = localStorage.getItem('token');
      
      if (!token) {
        token = sessionStorage.getItem('token');
        if (token) {
          console.log('Token retrieved from sessionStorage fallback');
          // Restore to localStorage
          localStorage.setItem('token', token);
        }
      }
      
      return token;
    } catch (e) {
      console.error('Error retrieving token:', e);
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
    
    // Even if the backend call fails, we want to clear storage
    this.http.delete(`${this.apiUrl}/logout`, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.token}`
      })
    }).pipe(
      tap(() => console.log('Logout API call successful')),
      catchError((error) => {
        console.error('Logout API call failed:', error);
        return of(null);
      })
    ).subscribe();
    
    // Clear both localStorage and sessionStorage
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      console.log('✅ Successfully cleared storage during logout');
    } catch (e) {
      console.error('❌ Failed to clear storage during logout:', e);
    }
    
    this.currentUserSubject.next(null);
    
    // Clear refresh interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
    
    this.router.navigate(['/login']);
  }

  // Verify token is still valid with backend
  verifyToken(): Observable<boolean> {
    if (!this.token) {
      return of(false);
    }
    
    return this.http.get<any>(`${this.apiUrl}/verify_token`, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.token}`
      })
    }).pipe(
      tap(() => console.log('Token verified successfully')),
      catchError(error => {
        console.error('Token verification failed:', error);
        // If token is invalid, log the user out
        if (error.status === 401) {
          this.logout();
        }
        return of(false);
      })
    );
  }
  
  // Optional: Implement token refresh logic
  refreshToken(): Observable<boolean> {
    if (!this.token) {
      return of(false);
    }
    
    return this.http.post<any>(`${this.apiUrl}/refresh_token`, {}, {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.token}`
      })
    }).pipe(
      tap(response => {
        console.log('Token refreshed successfully');
        this.handleAuthResponse(response);
        return true;
      }),
      catchError(error => {
        console.error('Token refresh failed:', error);
        // If refresh fails, log the user out on 401
        if (error.status === 401) {
          this.logout();
        }
        return of(false);
      })
    );
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
      
      // Try to store in both localStorage and sessionStorage with error handling
      try {       
        // Store in localStorage
        console.log('Storing token:', token.substring(0, 10) + '...');
        localStorage.setItem('token', token);
        
        // Also store in sessionStorage as backup
        sessionStorage.setItem('token', token);
        
        // Verify token was stored with explicit logging
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          console.log('✅ Token successfully stored in localStorage');
        } else {
          console.error('❌ Token was set but cannot be retrieved from localStorage');
        }
     
        // Store user data with better verification
        if (userData) {
          const userJson = JSON.stringify(userData);
          console.log('Storing user data, object keys:', Object.keys(userData));
          
          localStorage.setItem('user', userJson);
          sessionStorage.setItem('user', userJson);
          
          // Verify user data was stored
          const storedUserJson = localStorage.getItem('user');
          if (storedUserJson) {
            console.log('✅ User data successfully stored');
            
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
        console.error('❌ Failed to store auth data in storage:', e);
      }
    } catch (e) {
      console.error('❌ Error in handleAuthResponse:', e);
    }
  }
}