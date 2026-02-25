import { ContactImportService } from '../../lib/services/contact-import.service';
import { UserRepository } from '../../lib/repositories/user.repository';
import { User } from '@prisma/client';

// Mock the UserRepository
jest.mock('../../lib/repositories/user.repository');

describe('ContactImportService', () => {
  let contactImportService: ContactImportService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockUser: User = {
    id: 'user-1',
    email: 'john@example.com',
    passwordHash: 'hashed-password',
    name: 'John Doe',
    phone: '+1234567890',
    profilePicture: null,
    preferredCurrency: 'USD',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    contactImportService = new ContactImportService(mockUserRepository);
    jest.clearAllMocks();
  });

  describe('importContacts', () => {
    it('should import contacts and identify registered users', async () => {
      const contacts = [
        { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '+9876543210' },
      ];

      mockUserRepository.findUserByEmail
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      mockUserRepository.searchUsers.mockResolvedValue([]);

      const result = await contactImportService.importContacts(contacts);

      expect(result.totalContacts).toBe(2);
      expect(result.registeredUsers).toHaveLength(1);
      expect(result.unregisteredContacts).toHaveLength(1);
      expect(result.registeredUsers[0].user).toEqual(mockUser);
    });

    it('should find users by phone when email lookup fails', async () => {
      const contacts = [
        { name: 'John Doe', email: 'different@example.com', phone: '+1234567890' },
      ];

      mockUserRepository.findUserByEmail.mockResolvedValue(null);
      mockUserRepository.searchUsers.mockResolvedValue([mockUser]);

      const result = await contactImportService.importContacts(contacts);

      expect(result.registeredUsers).toHaveLength(1);
      expect(result.registeredUsers[0].user).toEqual(mockUser);
    });

    it('should handle contacts without email or phone', async () => {
      const contacts = [
        { name: 'John Doe' },
      ];

      const result = await contactImportService.importContacts(contacts);

      expect(result.totalContacts).toBe(1);
      expect(result.unregisteredContacts).toHaveLength(1);
    });
  });

  describe('parseCSVContacts', () => {
    it('should parse CSV with standard headers', async () => {
      const csvData = `Name,Email,Phone
John Doe,john@example.com,+1234567890
Jane Smith,jane@example.com,+9876543210`;

      const result = await contactImportService.parseCSVContacts(csvData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });
    });

    it('should handle CSV with quoted values', async () => {
      const csvData = `Name,Email,Phone
"Doe, John",john@example.com,"+1 (234) 567-8900"`;

      const result = await contactImportService.parseCSVContacts(csvData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Doe, John');
      expect(result[0].phone).toBe('+12345678900');
    });

    it('should handle CSV with alternative headers', async () => {
      const csvData = `Full Name,Email Address,Mobile
John Doe,john@example.com,+1234567890`;

      const result = await contactImportService.parseCSVContacts(csvData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should skip rows with empty names', async () => {
      const csvData = `Name,Email,Phone
John Doe,john@example.com,+1234567890
,empty@example.com,+1111111111`;

      const result = await contactImportService.parseCSVContacts(csvData);

      expect(result).toHaveLength(1);
    });
  });

  describe('parseVCardContacts', () => {
    it('should parse vCard format', async () => {
      const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL:john@example.com
TEL:+1234567890
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Jane Smith
EMAIL:jane@example.com
TEL:+9876543210
END:VCARD`;

      const result = await contactImportService.parseVCardContacts(vCardData);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });
    });

    it('should handle vCard with different field formats', async () => {
      const vCardData = `BEGIN:VCARD
VERSION:3.0
FN:John Doe
EMAIL;TYPE=WORK:john@example.com
TEL;TYPE=CELL:+1234567890
END:VCARD`;

      const result = await contactImportService.parseVCardContacts(vCardData);

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('john@example.com');
      expect(result[0].phone).toBe('+1234567890');
    });

    it('should skip vCards without names', async () => {
      const vCardData = `BEGIN:VCARD
VERSION:3.0
EMAIL:nname@example.com
END:VCARD`;

      const result = await contactImportService.parseVCardContacts(vCardData);

      expect(result).toHaveLength(0);
    });
  });

  describe('validateContactData', () => {
    it('should validate correct contact data', () => {
      const contacts = [
        { name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        { name: 'Jane Smith', email: 'jane@example.com' },
      ];

      const result = contactImportService.validateContactData(contacts);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(0);
    });

    it('should identify invalid contact data', () => {
      const contacts = [
        { name: '', email: 'john@example.com', phone: '+1234567890' },
        { name: 'Jane Smith', email: 'invalid-email', phone: 'invalid-phone' },
      ];

      const result = contactImportService.validateContactData(contacts);

      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(2);
      expect(result.invalid[0].errors).toContain('Name is required');
      expect(result.invalid[1].errors).toContain('Invalid email format');
      expect(result.invalid[1].errors).toContain('Invalid phone number format');
    });

    it('should allow contacts with only name', () => {
      const contacts = [
        { name: 'John Doe' },
      ];

      const result = contactImportService.validateContactData(contacts);

      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(0);
    });
  });

  describe('normalizePhoneNumber', () => {
    it('should normalize phone numbers correctly', () => {
      const service = contactImportService as any;
      
      expect(service.normalizePhoneNumber('+1 (234) 567-8900')).toBe('+12345678900');
      expect(service.normalizePhoneNumber('234-567-8900')).toBe('2345678900');
      expect(service.normalizePhoneNumber('12345678900')).toBe('+12345678900');
      expect(service.normalizePhoneNumber('')).toBe('');
    });
  });

  describe('suggestFriendsFromContacts', () => {
    it('should suggest friends from imported contacts', async () => {
      const contacts = [
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Smith', email: 'jane@example.com' },
      ];

      mockUserRepository.findUserByEmail
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);
      mockUserRepository.searchUsers.mockResolvedValue([]);

      const result = await contactImportService.suggestFriendsFromContacts('user-2', contacts);

      expect(result).toHaveLength(1);
      expect(result[0].user).toEqual(mockUser);
    });

    it('should exclude the current user from suggestions', async () => {
      const contacts = [
        { name: 'John Doe', email: 'john@example.com' },
      ];

      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockUserRepository.searchUsers.mockResolvedValue([]);

      const result = await contactImportService.suggestFriendsFromContacts('user-1', contacts);

      expect(result).toHaveLength(0);
    });
  });
});