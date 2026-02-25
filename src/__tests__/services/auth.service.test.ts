import { AuthService, AuthTokens } from '../../lib/services/auth.service';
import { UserRepository } from '../../lib/repositories/user.repository';
import { User } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { Redis } from 'ioredis';

// Mock dependencies
jest.mock('jsonwebtoken');
jest.mock('../../lib/repositories/user.repository');

const mockJwt = jwt as jest.Mocked<typeof jwt>;
const MockUserRepository = UserRepository as jest.MockedClass<typeof UserRepository>;

// Mock Redis
const mockRedis = {
  setex: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
} as unknown as Redis;

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockUser: User;

  beforeEach(() => {
    mockUserRepository = new MockUserRepository() as jest.Mocked<UserRepository>;
    authService = new AuthService(mockUserRepository, mockRedis, {
      accessTokenSecret: 'test-access-secret',
      refreshTokenSecret: 'test-refresh-secret',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
    });

    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      name: 'John Doe',
      phone: '+1234567890',
      profilePicture: null,
      preferredCurrency: 'USD',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        phone: '+1234567890',
        preferredCurrency: 'USD',
      };

      const tokens: AuthTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(null);
      mockUserRepository.createUser.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await authService.register(userData);

      expect(mockUserRepository.findUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUserRepository.createUser).toHaveBeenCalledWith(userData);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens).toEqual(tokens);
    });

    it('should throw error when email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should throw error for invalid input data', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: 'weak',
        name: '',
      };

      await expect(authService.register(invalidUserData)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const tokens: AuthTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockUserRepository.verifyPassword.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await authService.login(credentials);

      expect(mockUserRepository.verifyPassword).toHaveBeenCalledWith(
        'test@example.com',
        'Password123!'
      );
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens).toEqual(tokens);
    });

    it('should throw error for invalid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserRepository.verifyPassword.mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for unverified email', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123!',
      };

      const unverifiedUser = { ...mockUser, emailVerified: false };
      mockUserRepository.verifyPassword.mockResolvedValue(unverifiedUser);

      await expect(authService.login(credentials)).rejects.toThrow(
        'Please verify your email before logging in'
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'refresh' as const,
      };

      mockJwt.verify.mockReturnValue(payload);
      (mockRedis.get as jest.Mock).mockResolvedValue(refreshToken);
      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');
      (mockRedis.setex as jest.Mock).mockResolvedValue('OK');

      const result = await authService.refreshToken(refreshToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(refreshToken, 'test-refresh-secret');
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error for wrong token type', async () => {
      const refreshToken = 'access-token-used-as-refresh';
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'access' as const,
      };

      mockJwt.verify.mockReturnValue(payload);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid token type');
    });

    it('should throw error when refresh token not found in Redis', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'refresh' as const,
      };

      mockJwt.verify.mockReturnValue(payload);
      (mockRedis.get as jest.Mock).mockResolvedValue(null);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });

    it('should throw error when user not found', async () => {
      const refreshToken = 'valid-refresh-token';
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'refresh' as const,
      };

      mockJwt.verify.mockReturnValue(payload);
      (mockRedis.get as jest.Mock).mockResolvedValue(refreshToken);
      mockUserRepository.findUserById.mockResolvedValue(null);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('User not found');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      (mockRedis.del as jest.Mock).mockResolvedValue(1);

      await authService.logout('user-1');

      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user-1');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(mockUser);
      mockUserRepository.updatePassword.mockResolvedValue(mockUser);
      (mockRedis.del as jest.Mock).mockResolvedValue(1);

      await authService.changePassword('user-1', passwordData);

      expect(mockUserRepository.verifyPassword).toHaveBeenCalledWith(
        'test@example.com',
        'OldPassword123!'
      );
      expect(mockUserRepository.updatePassword).toHaveBeenCalledWith('user-1', 'NewPassword123!');
      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user-1');
    });

    it('should throw error when user not found', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      };

      mockUserRepository.findUserById.mockResolvedValue(null);

      await expect(authService.changePassword('user-1', passwordData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error when current password is incorrect', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.verifyPassword.mockResolvedValue(null);

      await expect(authService.changePassword('user-1', passwordData)).rejects.toThrow(
        'Current password is incorrect'
      );
    });
  });

  describe('verifyAccessToken', () => {
    it('should verify access token successfully', async () => {
      const accessToken = 'valid-access-token';
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'access' as const,
      };

      mockJwt.verify.mockReturnValue(payload);

      const result = await authService.verifyAccessToken(accessToken);

      expect(mockJwt.verify).toHaveBeenCalledWith(accessToken, 'test-access-secret');
      expect(result).toEqual(payload);
    });

    it('should throw error for invalid access token', async () => {
      const accessToken = 'invalid-access-token';

      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow(
        'Invalid access token'
      );
    });

    it('should throw error for wrong token type', async () => {
      const accessToken = 'refresh-token-used-as-access';
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'refresh' as const,
      };

      mockJwt.verify.mockReturnValue(payload);

      await expect(authService.verifyAccessToken(accessToken)).rejects.toThrow('Invalid token type');
    });
  });

  describe('getUserFromToken', () => {
    it('should get user from valid token', async () => {
      const accessToken = 'valid-access-token';
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'access' as const,
      };

      mockJwt.verify.mockReturnValue(payload);
      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const result = await authService.getUserFromToken(accessToken);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result?.id).toBe('user-1');
    });

    it('should return null for invalid token', async () => {
      const accessToken = 'invalid-access-token';

      mockJwt.verify.mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });

      const result = await authService.getUserFromToken(accessToken);

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      const accessToken = 'valid-access-token';
      const payload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'access' as const,
      };

      mockJwt.verify.mockReturnValue(payload);
      mockUserRepository.findUserById.mockResolvedValue(null);

      const result = await authService.getUserFromToken(accessToken);

      expect(result).toBeNull();
    });
  });

  describe('password reset functionality', () => {
    it('should throw not implemented error for requestPasswordReset', async () => {
      await expect(authService.requestPasswordReset('test@example.com')).rejects.toThrow(
        'Password reset functionality not yet implemented'
      );
    });

    it('should throw not implemented error for resetPassword', async () => {
      await expect(authService.resetPassword('token', 'newpassword')).rejects.toThrow(
        'Password reset functionality not yet implemented'
      );
    });
  });

  describe('email verification functionality', () => {
    it('should throw not implemented error for requestEmailVerification', async () => {
      mockUserRepository.findUserById.mockResolvedValue({ ...mockUser, emailVerified: false });

      await expect(authService.requestEmailVerification('user-1')).rejects.toThrow(
        'Email verification functionality not yet implemented'
      );
    });

    it('should throw error when user not found for email verification', async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      await expect(authService.requestEmailVerification('user-1')).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error when email already verified', async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      await expect(authService.requestEmailVerification('user-1')).rejects.toThrow(
        'Email is already verified'
      );
    });

    it('should throw not implemented error for verifyEmail', async () => {
      await expect(authService.verifyEmail('token')).rejects.toThrow(
        'Email verification functionality not yet implemented'
      );
    });
  });
});