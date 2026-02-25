import { UserRepository } from '../repositories/user.repository';
import { User } from '@prisma/client';

export interface ContactData {
  name: string;
  email?: string;
  phone?: string;
}

export interface ImportedContact extends ContactData {
  isRegistered: boolean;
  user?: User;
}

export interface ContactImportResult {
  totalContacts: number;
  registeredUsers: ImportedContact[];
  unregisteredContacts: ImportedContact[];
}

export class ContactImportService {
  private userRepository: UserRepository;

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || new UserRepository();
  }

  async importContacts(contacts: ContactData[]): Promise<ContactImportResult> {
    try {
      const result: ContactImportResult = {
        totalContacts: contacts.length,
        registeredUsers: [],
        unregisteredContacts: [],
      };

      // Process each contact
      for (const contact of contacts) {
        const importedContact = await this.processContact(contact);
        
        if (importedContact.isRegistered) {
          result.registeredUsers.push(importedContact);
        } else {
          result.unregisteredContacts.push(importedContact);
        }
      }

      // Sort results by name
      result.registeredUsers.sort((a, b) => a.name.localeCompare(b.name));
      result.unregisteredContacts.sort((a, b) => a.name.localeCompare(b.name));

      return result;
    } catch (error) {
      throw new Error(`Failed to import contacts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processContact(contact: ContactData): Promise<ImportedContact> {
    let user: User | null = null;

    // Try to find user by email first
    if (contact.email) {
      user = await this.userRepository.findUserByEmail(contact.email);
    }

    // If not found by email, try by phone
    if (!user && contact.phone) {
      const users = await this.userRepository.searchUsers(contact.phone);
      user = users.find(u => u.phone === contact.phone) || null;
    }

    return {
      ...contact,
      isRegistered: !!user,
      user: user || undefined,
    };
  }

  async parseVCardContacts(vCardData: string): Promise<ContactData[]> {
    try {
      const contacts: ContactData[] = [];
      const vCards = vCardData.split('BEGIN:VCARD');

      for (const vCard of vCards) {
        if (!vCard.trim()) continue;

        const contact = this.parseVCard(vCard);
        if (contact) {
          contacts.push(contact);
        }
      }

      return contacts;
    } catch (error) {
      throw new Error(`Failed to parse vCard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseVCard(vCardData: string): ContactData | null {
    const lines = vCardData.split('\n').map(line => line.trim());
    let name = '';
    let email = '';
    let phone = '';

    for (const line of lines) {
      if (line.startsWith('FN:')) {
        name = line.substring(3);
      } else if (line.startsWith('EMAIL')) {
        const emailMatch = line.match(/EMAIL[^:]*:(.+)/);
        if (emailMatch) {
          email = emailMatch[1];
        }
      } else if (line.startsWith('TEL')) {
        const phoneMatch = line.match(/TEL[^:]*:(.+)/);
        if (phoneMatch) {
          phone = this.normalizePhoneNumber(phoneMatch[1]);
        }
      }
    }

    if (!name) return null;

    return {
      name,
      email: email || undefined,
      phone: phone || undefined,
    };
  }

  async parseCSVContacts(csvData: string): Promise<ContactData[]> {
    try {
      const contacts: ContactData[] = [];
      const lines = csvData.split('\n').map(line => line.trim()).filter(line => line);

      if (lines.length === 0) return contacts;

      // Assume first line is header
      const headers = this.parseCSVLine(lines[0]).map(h => h.toLowerCase());
      const nameIndex = this.findColumnIndex(headers, ['name', 'full name', 'display name']);
      const emailIndex = this.findColumnIndex(headers, ['email', 'email address', 'e-mail']);
      const phoneIndex = this.findColumnIndex(headers, ['phone', 'phone number', 'mobile', 'cell']);

      // Process data lines
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        
        const name = nameIndex >= 0 ? values[nameIndex]?.trim() : '';
        const email = emailIndex >= 0 ? values[emailIndex]?.trim() : '';
        const phone = phoneIndex >= 0 ? this.normalizePhoneNumber(values[phoneIndex]?.trim() || '') : '';

        if (name) {
          contacts.push({
            name,
            email: email || undefined,
            phone: phone || undefined,
          });
        }
      }

      return contacts;
    } catch (error) {
      throw new Error(`Failed to parse CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(h => h.includes(name));
      if (index >= 0) return index;
    }
    return -1;
  }

  private normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +, keep it, otherwise add + if it looks international
    if (cleaned.startsWith('+')) {
      return cleaned;
    }
    
    // If it's a long number without +, assume it needs +
    if (cleaned.length > 10) {
      return '+' + cleaned;
    }
    
    return cleaned;
  }

  async suggestFriendsFromContacts(
    userId: string, 
    contacts: ContactData[]
  ): Promise<ImportedContact[]> {
    try {
      const result = await this.importContacts(contacts);
      
      // Filter out users who are already friends or have pending requests
      const suggestions: ImportedContact[] = [];
      
      for (const contact of result.registeredUsers) {
        if (contact.user && contact.user.id !== userId) {
          // Here you would check friendship status, but for now we'll include all
          suggestions.push(contact);
        }
      }

      return suggestions;
    } catch (error) {
      throw new Error(`Failed to get friend suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateContactData(contacts: ContactData[]): {
    valid: ContactData[];
    invalid: { contact: ContactData; errors: string[] }[];
  } {
    const valid: ContactData[] = [];
    const invalid: { contact: ContactData; errors: string[] }[] = [];

    for (const contact of contacts) {
      const errors: string[] = [];

      if (!contact.name || contact.name.trim().length === 0) {
        errors.push('Name is required');
      }

      if (contact.email && !this.isValidEmail(contact.email)) {
        errors.push('Invalid email format');
      }

      if (contact.phone && !this.isValidPhone(contact.phone)) {
        errors.push('Invalid phone number format');
      }

      if (errors.length === 0) {
        valid.push(contact);
      } else {
        invalid.push({ contact, errors });
      }
    }

    return { valid, invalid };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }
}