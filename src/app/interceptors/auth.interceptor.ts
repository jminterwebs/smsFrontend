// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Get token from service
    const token = this.authService.token;
    
    // Log token presence (obscured for security)
    console.log(`[Interceptor] Token ${token ? `found (${token.substring(0, 5)}...)` : 'not found'}`);
    
    // Skip adding token for login and register requests
    if (request.url.includes('/login') || request.url.includes('/signup')) {
      console.log('[Interceptor] Skipping auth header for auth endpoint');
      return next.handle(request);
    }
    
    // Clone the request and add the token if available
    if (token) {
      const authRequest = request.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log(`[Interceptor] Adding auth header to ${request.url}`);
      
      // Return the cloned request with the auth header
      return next.handle(authRequest).pipe(
        catchError((error: HttpErrorResponse) => {
          // Handle 401 Unauthorized errors
          if (error.status === 401) {
            console.log('[Interceptor] 401 error detected - trying to refresh token');
            
            // Try to refresh the token
            return this.handleUnauthorizedError(request, next);
          }
          
          // For other errors, pass them along
          return throwError(() => error);
        })
      );
    }
    
    // No token available, proceed without auth header
    console.log('[Interceptor] No token available');
    return next.handle(request);
  }
  
  private handleUnauthorizedError(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Try to restore from session storage if localStorage failed
    if (!localStorage.getItem('token') && sessionStorage.getItem('token')) {
      console.log('[Interceptor] Restoring token from sessionStorage');
      localStorage.setItem('token', sessionStorage.getItem('token')!);
      localStorage.setItem('user', sessionStorage.getItem('user')!);
      
      // Get the restored token
      const restoredToken = this.authService.token;
      if (restoredToken) {
        // Try the request again with the restored token
        const authRequest = request.clone({
          setHeaders: {
            Authorization: `Bearer ${restoredToken}`
          }
        });
        
        return next.handle(authRequest);
      }
    }
    
    // If we have a refresh endpoint, try to refresh the token
    // This assumes you have a refreshToken method in your AuthService
    return this.authService.refreshToken().pipe(
      switchMap(success => {
        if (success) {
          // Token refresh successful, retry the original request
          const token = this.authService.token;
          const authRequest = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
          
          return next.handle(authRequest);
        } else {
          // Token refresh failed, redirect to login
          this.authService.logout();
          return throwError(() => new Error('Session expired. Please login again.'));
        }
      }),
      catchError(refreshError => {
        // If refresh fails, logout and redirect
        console.error('[Interceptor] Token refresh failed:', refreshError);
        this.authService.logout();
        return throwError(() => refreshError);
      })
    );
  }
}