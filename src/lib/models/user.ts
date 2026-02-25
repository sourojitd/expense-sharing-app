import { User } from '@prisma/client';
import { z } from 'zod';

// Validation schemas for User model
export const CreateUserSchema = z.object({
  email: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required')
    .max(255, 'Email must be less than 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  preferredCurrency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters')
    .default('USD'),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ password: true }).extend({
  preferredCurrency: z
    .string()
    .length(3, 'Currency code must be 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters')
    .optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const PasswordResetSchema = z.object({
  email: z.string().email('Invalid email format'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

// Type definitions
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type CreateUserFormInput = z.input<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PasswordResetInput = z.infer<typeof PasswordResetSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// User model validation functions
export class UserValidator {
  static validateCreateUser(data: unknown): CreateUserInput {
    return CreateUserSchema.parse(data);
  }

  static validateUpdateUser(data: unknown): UpdateUserInput {
    return UpdateUserSchema.parse(data);
  }

  static validateLogin(data: unknown): LoginInput {
    return LoginSchema.parse(data);
  }

  static validatePasswordReset(data: unknown): PasswordResetInput {
    return PasswordResetSchema.parse(data);
  }

  static validateChangePassword(data: unknown): ChangePasswordInput {
    return ChangePasswordSchema.parse(data);
  }

  static isValidEmail(email: string): boolean {
    try {
      z.string().email().parse(email);
      return true;
    } catch {
      return false;
    }
  }

  static isValidPhone(phone: string): boolean {
    try {
      z.string().regex(/^\+?[1-9]\d{1,14}$/).parse(phone);
      return true;
    } catch {
      return false;
    }
  }

  static isValidCurrency(currency: string): boolean {
    try {
      z.string().length(3).regex(/^[A-Z]{3}$/).parse(currency);
      return true;
    } catch {
      return false;
    }
  }
}

// User model constraints and business rules
export class UserConstraints {
  static readonly MIN_PASSWORD_LENGTH = 8;
  static readonly MAX_PASSWORD_LENGTH = 128;
  static readonly MAX_EMAIL_LENGTH = 255;
  static readonly MAX_NAME_LENGTH = 255;
  static readonly CURRENCY_CODE_LENGTH = 3;
  
  static readonly SUPPORTED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
    'MXN', 'SGD', 'HKD', 'NOK', 'TRY', 'RUB', 'INR', 'BRL', 'ZAR', 'KRW'
  ];

  static isSupportedCurrency(currency: string): boolean {
    return this.SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
  }

  static validateUserConstraints(user: Partial<User>): string[] {
    const errors: string[] = [];

    if (user.email && user.email.length > this.MAX_EMAIL_LENGTH) {
      errors.push(`Email must be less than ${this.MAX_EMAIL_LENGTH} characters`);
    }

    if (user.name && user.name.length > this.MAX_NAME_LENGTH) {
      errors.push(`Name must be less than ${this.MAX_NAME_LENGTH} characters`);
    }

    if (user.preferredCurrency && !this.isSupportedCurrency(user.preferredCurrency)) {
      errors.push(`Currency ${user.preferredCurrency} is not supported`);
    }

    return errors;
  }
}