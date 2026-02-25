import { UserRepository } from '../../lib/repositories/user.repository';
import { PrismaClient, User, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Helper function to create Prisma errors
function createPrismaError(code: string, message: string): Prisma.PrismaClientKnownRequestError {
  const error = new Error(message) as any;
  error.code = code;
  error.name = 'PrismaClientKnownRequestError';
  Object.setPrototypeOf(error, Prisma.PrismaClientKnownRequestError.prototype);
  return error;
}

// Mock Prisma Client
const mockPrismaClient = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  expense: {
    count: jest.fn(),
  },
  groupMember: {
    count: jest.fn(),
  },
  friendRequest: {
    count: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserRepository', () => {
  let userRepository: UserRepository;
  let mockUser: User;

  beforeEach(() => {
    userRepository = new UserRepository(mockPrismaClient);
    mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'hashedpassword',
      name: 'John Doe',
      phone: '+1234567890',
      profilePicture: null,
      preferredCurrency: 'USD',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
        phone: '+1234567890',
        preferredCurrency: 'USD',
      };

      mockBcrypt.hash.mockResolvedValue('hashedpassword');
      (mockPrismaClient.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await userRepository.createUser(userData);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(mockPrismaClient.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          name: 'John Doe',
          phone: '+1234567890',
          preferredCurrency: 'USD',
          passwordHash: 'hashedpassword',
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw error when email already exists', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'John Doe',
      };

      mockBcrypt.hash.mockResolvedValue('hashedpassword');
      const prismaError = createPrismaError('P2002', 'Unique constraint failed');
      (mockPrismaClient.user.create as jest.Mock).mockRejectedValue(prismaError);

      await expect(userRepository.createUser(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });
  });

  describe('findUserById', () => {
    it('should find user by id', async () => {
      (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userRepository.findUserById('user-1');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userRepository.findUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email (case insensitive)', async () => {
      (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await userRepository.findUserByEmail('TEST@EXAMPLE.COM');

      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = { name: 'Jane Doe', phone: '+9876543210' };
      const updatedUser = { ...mockUser, ...updateData };

      (mockPrismaClient.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await userRepository.updateUser('user-1', updateData);

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: updateData,
      });
      expect(result).toEqual(updatedUser);
    });

    it('should throw error when user not found', async () => {
      const updateData = { name: 'Jane Doe' };
      const prismaError = createPrismaError('P2025', 'Record not found');
      (mockPrismaClient.user.update as jest.Mock).mockRejectedValue(prismaError);

      await expect(userRepository.updateUser('nonexistent', updateData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error when email already in use', async () => {
      const updateData = { email: 'existing@example.com' };
      const prismaError = createPrismaError('P2002', 'Unique constraint failed');
      (mockPrismaClient.user.update as jest.Mock).mockRejectedValue(prismaError);

      await expect(userRepository.updateUser('user-1', updateData)).rejects.toThrow(
        'Email already in use by another user'
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      (mockPrismaClient.user.delete as jest.Mock).mockResolvedValue(mockUser);

      await userRepository.deleteUser('user-1');

      expect(mockPrismaClient.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw error when user not found', async () => {
      const prismaError = createPrismaError('P2025', 'Record not found');
      (mockPrismaClient.user.delete as jest.Mock).mockRejectedValue(prismaError);

      await expect(userRepository.deleteUser('nonexistent')).rejects.toThrow(
        'User not found'
      );
    });
  });

  describe('verifyUserEmail', () => {
    it('should verify user email successfully', async () => {
      const verifiedUser = { ...mockUser, emailVerified: true };
      (mockPrismaClient.user.update as jest.Mock).mockResolvedValue(verifiedUser);

      const result = await userRepository.verifyUserEmail('user-1');

      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { emailVerified: true },
      });
      expect(result.emailVerified).toBe(true);
    });
  });

  describe('updatePassword', () => {
    it('should update password with new hash', async () => {
      const newPassword = 'NewPassword123!';
      const newHashedPassword = 'newhashedpassword';
      
      mockBcrypt.hash.mockResolvedValue(newHashedPassword);
      const updatedUser = { ...mockUser, passwordHash: newHashedPassword };
      (mockPrismaClient.user.update as jest.Mock).mockResolvedValue(updatedUser);

      const result = await userRepository.updatePassword('user-1', newPassword);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
      expect(mockPrismaClient.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { passwordHash: newHashedPassword },
      });
      expect(result).toEqual(updatedUser);
    });
  });

  describe('verifyPassword', () => {
    it('should return user when password is correct', async () => {
      (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);

      const result = await userRepository.verifyPassword('test@example.com', 'Password123!');

      expect(mockBcrypt.compare).toHaveBeenCalledWith('Password123!', 'hashedpassword');
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userRepository.verifyPassword('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      const result = await userRepository.verifyPassword('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('searchUsers', () => {
    it('should search users by name and email', async () => {
      const searchResults = [mockUser];
      (mockPrismaClient.user.findMany as jest.Mock).mockResolvedValue(searchResults);

      const result = await userRepository.searchUsers('john');

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: 'john', mode: 'insensitive' } },
                { email: { contains: 'john', mode: 'insensitive' } },
              ],
            },
            {
              id: { notIn: [] },
            },
          ],
        },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          profilePicture: true,
          createdAt: true,
          updatedAt: true,
          phone: true,
          preferredCurrency: true,
          emailVerified: true,
          passwordHash: false,
        },
      });
      expect(result).toEqual(searchResults);
    });

    it('should exclude specified user IDs from search', async () => {
      const searchResults = [mockUser];
      (mockPrismaClient.user.findMany as jest.Mock).mockResolvedValue(searchResults);

      await userRepository.searchUsers('john', ['user-2', 'user-3']);

      expect(mockPrismaClient.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [
              expect.any(Object),
              {
                id: { notIn: ['user-2', 'user-3'] },
              },
            ],
          },
        })
      );
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      (mockPrismaClient.expense.count as jest.Mock).mockResolvedValue(5);
      (mockPrismaClient.groupMember.count as jest.Mock).mockResolvedValue(3);
      (mockPrismaClient.friendRequest.count as jest.Mock).mockResolvedValue(10);

      const result = await userRepository.getUserStats('user-1');

      expect(result).toEqual({
        totalExpenses: 5,
        totalGroups: 3,
        totalFriends: 10,
      });
    });
  });

  describe('isEmailTaken', () => {
    it('should return true when email is taken', async () => {
      (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });

      const result = await userRepository.isEmailTaken('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email is not taken', async () => {
      (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userRepository.isEmailTaken('available@example.com');

      expect(result).toBe(false);
    });

    it('should return false when email belongs to excluded user', async () => {
      (mockPrismaClient.user.findUnique as jest.Mock).mockResolvedValue({ id: 'user-1' });

      const result = await userRepository.isEmailTaken('test@example.com', 'user-1');

      expect(result).toBe(false);
    });
  });

  describe('getUsersWithPendingBalances', () => {
    it('should return empty array for now', async () => {
      const result = await userRepository.getUsersWithPendingBalances('user-1');

      expect(result).toEqual([]);
    });
  });
});