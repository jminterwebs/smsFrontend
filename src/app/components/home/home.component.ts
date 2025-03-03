// src/app/components/home/home.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  currentUser: any = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Get the current logged-in user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
    
    // If not logged in, redirect to login page
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
    }
  }

  logout(): void {
    // Just call logout without trying to subscribe
    this.authService.logout();
    // The router navigation is now handled inside the AuthService
  }
}