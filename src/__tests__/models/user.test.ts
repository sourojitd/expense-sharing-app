import { UserValidator, UserConstraints } from '../../lib/models/user';
import { ZodError } from 'zod';

describe('UserValidator', () => {
  describe('validateCreateUser', () => {
    it('should validate a valid user creation input', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        phone: '+1234567890',
        preferredCurrency: 'USD',
      };

      const result = UserValidator.validateCreateUser(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate user creation without optional fields', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
      };

      const result = UserValidator.validateCreateUser(validInput);
      expect(result.email).toBe(validInput.email);
      expect(result.password).toBe(validInput.password);
      expect(result.name).toBe(validInput.name);
      expect(result.preferredCurrency).toBe('USD'); // default value
    });

    it('should throw error for invalid email', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'Password123!',
        name: 'John Doe',
      };

      expect(() => UserValidator.validateCreateUser(invalidInput)).toThrow(ZodError);
    });

    it('should throw error for weak password', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'weak',
        name: 'John Doe',
      };

      expect(() => UserValidator.validateCreateUser(invalidInput)).toThrow(ZodError);
    });

    it('should throw error for password without special characters', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'Password123',
        name: 'John Doe',
      };

      expect(() => UserValidator.validateCreateUser(invalidInput)).toThrow(ZodError);
    });

    it('should throw error for empty name', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'Password123!',
        name: '',
      };

      expect(() => UserValidator.validateCreateUser(invalidInput)).toThrow(ZodError);
    });

    it('should throw error for name with numbers', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John123',
      };

      expect(() => UserValidator.validateCreateUser(invalidInput)).toThrow(ZodError);
    });

    it('should throw error for invalid phone number', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        phone: 'invalid-phone',
      };

      expect(() => UserValidator.validateCreateUser(invalidInput)).toThrow(ZodError);
    });

    it('should throw error for invalid currency code', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        preferredCurrency: 'INVALID',
      };

      expect(() => UserValidator.validateCreateUser(invalidInput)).toThrow(ZodError);
    });

    it('should accept empty string for phone', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        phone: '',
      };

      const result = UserValidator.validateCreateUser(validInput);
      expect(result.phone).toBe('');
    });
  });

  describe('validateUpdateUser', () => {
    it('should validate partial user update', () => {
      const validInput = {
        name: 'Jane Doe',
        phone: '+9876543210',
      };

      const result = UserValidator.validateUpdateUser(validInput);
      expect(result).toEqual(validInput);
    });

    it('should not allow password in update', () => {
      const invalidInput = {
        name: 'Jane Doe',
        password: 'NewPassword123!',
      };

      const result = UserValidator.validateUpdateUser(invalidInput);
      expect(result).not.toHaveProperty('password');
    });

    it('should validate empty update object', () => {
      const validInput = {};

      const result = UserValidator.validateUpdateUser(validInput);
      expect(result).toEqual({});
    });
  });

  describe('validateLogin', () => {
    it('should validate valid login credentials', () => {
      const validInput = {
        email: 'test@example.com',
        password: 'anypassword',
      };

      const result = UserValidator.validateLogin(validInput);
      expect(result).toEqual(validInput);
    });

    it('should throw error for invalid email in login', () => {
      const invalidInput = {
        email: 'invalid-email',
        password: 'anypassword',
      };

      expect(() => UserValidator.validateLogin(invalidInput)).toThrow(ZodError);
    });

    it('should throw error for empty password in login', () => {
      const invalidInput = {
        email: 'test@example.com',
        password: '',
      };

      expect(() => UserValidator.validateLogin(invalidInput)).toThrow(ZodError);
    });
  });

  describe('validatePasswordReset', () => {
    it('should validate valid email for password reset', () => {
      const validInput = {
        email: 'test@example.com',
      };

      const result = UserValidator.validatePasswordReset(validInput);
      expect(result).toEqual(validInput);
    });

    it('should throw error for invalid email in password reset', () => {
      const invalidInput = {
        email: 'invalid-email',
      };

      expect(() => UserValidator.validatePasswordReset(invalidInput)).toThrow(ZodError);
    });
  });

  describe('validateChangePassword', () => {
    it('should validate valid password change', () => {
      const validInput = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      const result = UserValidator.validateChangePassword(validInput);
      expect(result).toEqual(validInput);
    });

    it('should throw error for weak new password', () => {
      const invalidInput = {
        currentPassword: 'OldPassword123!',
        newPassword: 'weak',
      };

      expect(() => UserValidator.validateChangePassword(invalidInput)).toThrow(ZodError);
    });
  });

  describe('utility methods', () => {
    describe('isValidEmail', () => {
      it('should return true for valid email', () => {
        expect(UserValidator.isValidEmail('test@example.com')).toBe(true);
      });

      it('should return false for invalid email', () => {
        expect(UserValidator.isValidEmail('invalid-email')).toBe(false);
      });
    });

    describe('isValidPhone', () => {
      it('should return true for valid phone numbers', () => {
        expect(UserValidator.isValidPhone('+1234567890')).toBe(true);
        expect(UserValidator.isValidPhone('1234567890')).toBe(true);
      });

      it('should return false for invalid phone numbers', () => {
        expect(UserValidator.isValidPhone('invalid-phone')).toBe(false);
        expect(UserValidator.isValidPhone('0123456789')).toBe(false); // starts with 0
      });
    });

    describe('isValidCurrency', () => {
      it('should return true for valid currency codes', () => {
        expect(UserValidator.isValidCurrency('USD')).toBe(true);
        expect(UserValidator.isValidCurrency('EUR')).toBe(true);
      });

      it('should return false for invalid currency codes', () => {
        expect(UserValidator.isValidCurrency('usd')).toBe(false); // lowercase
        expect(UserValidator.isValidCurrency('INVALID')).toBe(false); // too long
        expect(UserValidator.isValidCurrency('US')).toBe(false); // too short
      });
    });
  });
});

describe('UserConstraints', () => {
  describe('isSupportedCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(UserConstraints.isSupportedCurrency('USD')).toBe(true);
      expect(UserConstraints.isSupportedCurrency('EUR')).toBe(true);
      expect(UserConstraints.isSupportedCurrency('GBP')).toBe(true);
      expect(UserConstraints.isSupportedCurrency('INR')).toBe(true);
    });

    it('should return true for supported currencies in lowercase', () => {
      expect(UserConstraints.isSupportedCurrency('usd')).toBe(true);
      expect(UserConstraints.isSupportedCurrency('eur')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(UserConstraints.isSupportedCurrency('XYZ')).toBe(false);
      expect(UserConstraints.isSupportedCurrency('INVALID')).toBe(false);
    });
  });

  describe('validateUserConstraints', () => {
    it('should return empty array for valid user', () => {
      const validUser = {
        email: 'test@example.com',
        name: 'John Doe',
        preferredCurrency: 'USD',
      };

      const errors = UserConstraints.validateUserConstraints(validUser);
      expect(errors).toEqual([]);
    });

    it('should return error for email too long', () => {
      const invalidUser = {
        email: 'a'.repeat(256) + '@example.com',
      };

      const errors = UserConstraints.validateUserConstraints(invalidUser);
      expect(errors).toContain('Email must be less than 255 characters');
    });

    it('should return error for name too long', () => {
      const invalidUser = {
        name: 'a'.repeat(256),
      };

      const errors = UserConstraints.validateUserConstraints(invalidUser);
      expect(errors).toContain('Name must be less than 255 characters');
    });

    it('should return error for unsupported currency', () => {
      const invalidUser = {
        preferredCurrency: 'XYZ',
      };

      const errors = UserConstraints.validateUserConstraints(invalidUser);
      expect(errors).toContain('Currency XYZ is not supported');
    });

    it('should return multiple errors for multiple violations', () => {
      const invalidUser = {
        email: 'a'.repeat(256) + '@example.com',
        name: 'a'.repeat(256),
        preferredCurrency: 'XYZ',
      };

      const errors = UserConstraints.validateUserConstraints(invalidUser);
      expect(errors).toHaveLength(3);
    });
  });

  describe('constants', () => {
    it('should have correct constraint values', () => {
      expect(UserConstraints.MIN_PASSWORD_LENGTH).toBe(8);
      expect(UserConstraints.MAX_PASSWORD_LENGTH).toBe(128);
      expect(UserConstraints.MAX_EMAIL_LENGTH).toBe(255);
      expect(UserConstraints.MAX_NAME_LENGTH).toBe(255);
      expect(UserConstraints.CURRENCY_CODE_LENGTH).toBe(3);
    });

    it('should have supported currencies array', () => {
      expect(UserConstraints.SUPPORTED_CURRENCIES).toBeInstanceOf(Array);
      expect(UserConstraints.SUPPORTED_CURRENCIES.length).toBeGreaterThan(0);
      expect(UserConstraints.SUPPORTED_CURRENCIES).toContain('USD');
      expect(UserConstraints.SUPPORTED_CURRENCIES).toContain('EUR');
    });
  });
});