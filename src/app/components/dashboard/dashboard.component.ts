// src/app/components/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: any = null;
  messageForm: FormGroup;
  submitted = false;
  submitSuccess = false;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    // Initialize the form with validators
    this.messageForm = this.fb.group({
      numberInput: ['', [Validators.required, Validators.min(1)]],
      messageText: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;
  }
  
  // Method to handle logout
  logout(): void {
    this.authService.logout();
  }

  // Method to handle form submission
  onSubmit(): void {
    this.submitted = true;
    
    // Stop if the form is invalid
    if (this.messageForm.invalid) {
      return;
    }
    
    // Here you would typically send the form data to your backend
    console.log('Form submitted with:', this.messageForm.value);
    
    // Show success message
    this.submitSuccess = true;
    
    // Reset the form after submission
    setTimeout(() => {
      this.submitted = false;
      this.submitSuccess = false;
      this.messageForm.reset();
    }, 3000);
  }
}