// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { authGuard } from './guards/auth.guard';


export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  // Make sure you have this route for registration
  { path: 'signup', component: RegisterComponent }, // or 'register' depending on your preference
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [authGuard]  // Add the guard here
  },
  { path: '**', redirectTo: '' }
];
