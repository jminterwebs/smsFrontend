// src/app/pipes/phone-number.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneNumber',
  standalone: true
})
export class PhoneNumberPipe implements PipeTransform {
  transform(value: string | number): string {
    if (!value) return '';
    
    // Convert to string and remove all non-digits
    const phoneNumber = value.toString().replace(/\D/g, '');
    
    // Format based on length
    if (phoneNumber.length === 10) {
      // Format as: (XXX) XXX-XXXX
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    } else if (phoneNumber.length === 11 && phoneNumber.startsWith('1')) {
      // Format as: +1 (XXX) XXX-XXXX 
      return `+1 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 11)}`;
    } else {
      // If it doesn't fit expected patterns, just return as is with some basic grouping
      return phoneNumber.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
  }
}