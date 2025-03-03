import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
// Make sure this import is the actual service class, not just an interface
import { MessageService, MessageData, Message } from '../../services/message.service';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PhoneNumberPipe } from '../../pipes/phone-number.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PhoneNumberPipe],
  // If your service isn't provided at root, add it here
  // providers: [MessageService],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: any = null;
  messageForm: FormGroup;
  submitted = false;
  submitSuccess = false;
  errorMessage: string = '';
  isLoading = false;
  userMessages: Message[] = [];

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
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
    this.loadUserMessages();
  }
  
  // Load user messages
  loadUserMessages(): void {
    this.isLoading = true;
    this.messageService.getMessages().subscribe({
      next: (messages: Message[]) => {
        this.userMessages = messages;
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading messages:', error);
        this.isLoading = false;
        this.errorMessage = 'Failed to load your messages. Please try again later.';
      }
    });
  }
  
  // Method to handle logout
  logout(): void {
    this.authService.logout();
  }

  // Method to handle form submission
  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    
    // Stop if the form is invalid
    if (this.messageForm.invalid) {
      return;
    }
    
    // Set loading state
    this.isLoading = true;
    
    // Prepare data for API using the correct type
    const messageData: MessageData = {
      numberInput: this.messageForm.value.numberInput,
      messageText: this.messageForm.value.messageText
    };
    
    // Send the form data to our backend via the message service
    this.messageService.createMessage(messageData).subscribe({
      next: (response: Message) => {
        console.log('Message created:', response);
        
        // Show success message
        this.submitSuccess = true;
        this.isLoading = false;
        
        // Reload messages after successful submission
        this.loadUserMessages();
        
        // Reset the form after submission
        setTimeout(() => {
          this.submitted = false;
          this.submitSuccess = false;
          this.messageForm.reset();
        }, 3000);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error creating message:', error);
        this.isLoading = false;
        
        if (error.error && error.error.errors) {
          // Display the first error message
          this.errorMessage = Array.isArray(error.error.errors) 
            ? error.error.errors[0] 
            : 'Failed to create message';
        } else {
          this.errorMessage = 'An unexpected error occurred. Please try again later.';
        }
      }
    });
  }
  
  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
}