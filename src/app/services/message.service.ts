// src/app/services/message.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MessageData {
  numberInput: number;
  messageText: string;
}

export interface Message extends MessageData {
  id: string;
  created_at: string;
  updated_at: string;
  to: string;
  number_input: number;
  message_text: string
  twilio_id: string
  from: string
}

@Injectable({
  providedIn: 'root'  // This is important for root-level services
})
export class MessageService {
  private apiUrl = 'http://localhost:3000/api/v1/messages'; // Match the auth service URL structure

  constructor(private http: HttpClient) { }

  createMessage(messageData: MessageData): Observable<Message> {
    return this.http.post<Message>(this.apiUrl, { message: messageData });
  }

  getMessages(): Observable<Message[]> {
    return this.http.get<Message[]>(this.apiUrl);
  }
}