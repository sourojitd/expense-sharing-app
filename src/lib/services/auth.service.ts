import jwt from 'jsonwebtoken';
import { User } from '@prisma/client';
import { UserRepository } from '../repositories/user.repository';
import { UserValidator, CreateUserInput, LoginInput, ChangePasswordInput } from '../models/user';
import { Redis } from 'ioredis';
import { EmailService } from './email.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  tokens: AuthTokens;
}

export interface TokenPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

export interface VerificationTokenPayload {
  email: string;
  type: 'email-verification' | 'password-reset';
}

export class AuthService {
  private userRepository: UserRepository;
  private redis?: Redis;
  private emailService: EmailService;
  private accessTokenSecret: string;
  private refreshTokenSecret: string;
  private accessTokenExpiry: string;
  private refreshTokenExpiry: string;

  constructor(
    userRepository?: UserRepository,
    redis?: Redis,
    config?: {
      accessTokenSecret?: string;
      refreshTokenSecret?: string;
      accessTokenExpiry?: string;
      refreshTokenExpiry?: string;
    }
  ) {
    this.userRepository = userRepository || new UserRepository();
    this.redis = redis;
    this.emailService = new EmailService();

    // Use environment variables or defaults for testing
    this.accessTokenSecret = config?.accessTokenSecret || process.env.JWT_ACCESS_SECRET || 'access-secret-key';
    this.refreshTokenSecret = config?.refreshTokenSecret || process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';
    this.accessTokenExpiry = config?.accessTokenExpiry || process.env.JWT_ACCESS_EXPIRY || '15m';
    this.refreshTokenExpiry = config?.refreshTokenExpiry || process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  async register(userData: CreateUserInput): Promise<AuthResult> {
    // Validate input data
    const validatedData = UserValidator.validateCreateUser(userData);

    // Check if email is already taken
    const existingUser = await this.userRepository.findUserByEmail(validatedData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Create user
    const user = await this.userRepository.createUser(validatedData);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token in Redis if available
    if (this.redis) {
      await this.storeRefreshToken(user.id, tokens.refreshToken);
    }

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async login(credentials: LoginInput): Promise<AuthResult> {
    // Validate input data
    const validatedCredentials = UserValidator.validateLogin(credentials);

    // Verify user credentials
    const user = await this.userRepository.verifyPassword(
      validatedCredentials.email,
      validatedCredentials.password
    );

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new Error('Please verify your email before logging in');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token in Redis if available
    if (this.redis) {
      await this.storeRefreshToken(user.id, tokens.refreshToken);
    }

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.refreshTokenSecret) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      // Check if refresh token exists in Redis
      if (this.redis) {
        const storedToken = await this.redis.get(`refresh_token:${payload.userId}`);
        if (storedToken !== refreshToken) {
          throw new Error('Invalid refresh token');
        }
      }

      // Get user
      const user = await this.userRepository.findUserById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Update refresh token in Redis
      if (this.redis) {
        await this.storeRefreshToken(user.id, tokens.refreshToken);
      }

      return tokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  async logout(userId: string): Promise<void> {
    // Remove refresh token from Redis
    if (this.redis) {
      await this.redis.del(`refresh_token:${userId}`);
    }
  }

  async changePassword(userId: string, passwordData: ChangePasswordInput): Promise<void> {
    // Validate input data
    const validatedData = UserValidator.validateChangePassword(passwordData);

    // Get user
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await this.userRepository.verifyPassword(
      user.email,
      validatedData.currentPassword
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Update password
    await this.userRepository.updatePassword(userId, validatedData.newPassword);

    // Invalidate all refresh tokens for this user
    if (this.redis) {
      await this.redis.del(`refresh_token:${userId}`);
    }
  }

  async verifyAccessToken(token: string): Promise<TokenPayload> {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as TokenPayload;

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  async getUserFromToken(token: string): Promise<Omit<User, 'passwordHash'> | null> {
    try {
      const payload = await this.verifyAccessToken(token);
      const user = await this.userRepository.findUserById(payload.userId);
      
      if (!user) {
        return null;
      }

      return this.sanitizeUser(user);
    } catch {
      return null;
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const accessTokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      type: 'access',
    };

    const refreshTokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessTokenPayload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    if (!this.redis) return;

    // Store refresh token with expiry (7 days by default)
    const expirySeconds = this.parseExpiryToSeconds(this.refreshTokenExpiry);
    await this.redis.setex(`refresh_token:${userId}`, expirySeconds, refreshToken);
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60; // Default to 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 7 * 24 * 60 * 60;
    }
  }

  private sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  // Password reset functionality
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findUserByEmail(email);

    // Always return silently to avoid leaking whether the email exists
    if (!user) {
      return;
    }

    const token = this.generateVerificationToken(user.email, 'password-reset', '1h');
    await this.emailService.sendPasswordResetEmail(user.email, user.name, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const payload = this.verifyVerificationToken(token, 'password-reset');

    const user = await this.userRepository.findUserByEmail(payload.email);
    if (!user) {
      throw new Error('User not found');
    }

    await this.userRepository.updatePassword(user.id, newPassword);

    // Invalidate all refresh tokens for this user
    if (this.redis) {
      await this.redis.del(`refresh_token:${user.id}`);
    }
  }

  // Email verification functionality
  async requestEmailVerification(userId: string): Promise<void> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    const token = this.generateVerificationToken(user.email, 'email-verification', '24h');
    await this.emailService.sendVerificationEmail(user.email, user.name, token);
  }

  async verifyEmail(token: string): Promise<void> {
    const payload = this.verifyVerificationToken(token, 'email-verification');

    const user = await this.userRepository.findUserByEmail(payload.email);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.emailVerified) {
      throw new Error('Email is already verified');
    }

    await this.userRepository.verifyUserEmail(user.id);
  }

  private generateVerificationToken(
    email: string,
    type: 'email-verification' | 'password-reset',
    expiresIn: string
  ): string {
    const payload: VerificationTokenPayload = { email, type };
    return jwt.sign(payload, this.accessTokenSecret, { expiresIn });
  }

  private verifyVerificationToken(
    token: string,
    expectedType: 'email-verification' | 'password-reset'
  ): VerificationTokenPayload {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as VerificationTokenPayload;

      if (payload.type !== expectedType) {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }
}