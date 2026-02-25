import { UserRepository } from '../../lib/repositories/user.repository';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  user: {
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

describe('UserRepository - Search Functionality', () => {
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository(mockPrisma);
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should search users by name, email, and phone', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          profilePicture: null,
          preferredCurrency: 'USD',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userRepository.searchUsers('john', ['exclude-id']);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { name: { contains: 'john', mode: 'insensitive' } },
                { email: { contains: 'john', mode: 'insensitive' } },
                { phone: { contains: 'john', mode: 'insensitive' } },
              ],
            },
            {
              id: { notIn: ['exclude-id'] },
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

      expect(result).toEqual(mockUsers);
    });
  });

  describe('searchUsersWithFuzzyMatching', () => {
    it('should perform fuzzy search with multiple terms', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          profilePicture: null,
          preferredCurrency: 'USD',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await userRepository.searchUsersWithFuzzyMatching('John Doe', []);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                // Exact phrase matches
                { name: { contains: 'John Doe', mode: 'insensitive' } },
                { email: { contains: 'John Doe', mode: 'insensitive' } },
                { phone: { contains: 'John Doe', mode: 'insensitive' } },
                // Individual term matches
                { name: { contains: 'john', mode: 'insensitive' } },
                { email: { contains: 'john', mode: 'insensitive' } },
                { phone: { contains: 'john', mode: 'insensitive' } },
                { name: { contains: 'doe', mode: 'insensitive' } },
                { email: { contains: 'doe', mode: 'insensitive' } },
                { phone: { contains: 'doe', mode: 'insensitive' } },
              ],
            },
            {
              id: { notIn: [] },
            },
          ],
        },
        take: 15,
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

      expect(result).toEqual(mockUsers);
    });

    it('should handle single term search', async () => {
      const mockUsers = [];
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      await userRepository.searchUsersWithFuzzyMatching('john', ['exclude-1']);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                // Exact phrase matches
                { name: { contains: 'john', mode: 'insensitive' } },
                { email: { contains: 'john', mode: 'insensitive' } },
                { phone: { contains: 'john', mode: 'insensitive' } },
                // Individual term matches (same as exact in this case)
                { name: { contains: 'john', mode: 'insensitive' } },
                { email: { contains: 'john', mode: 'insensitive' } },
                { phone: { contains: 'john', mode: 'insensitive' } },
              ],
            },
            {
              id: { notIn: ['exclude-1'] },
            },
          ],
        },
        take: 15,
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
    });

    it('should filter out empty search terms', async () => {
      const mockUsers = [];
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      await userRepository.searchUsersWithFuzzyMatching('john   doe  ', []);

      // Should only include 'john' and 'doe', not empty strings
      const call = (mockPrisma.user.findMany as jest.Mock).mock.calls[0][0];
      const orConditions = call.where.AND[0].OR;
      
      // Should have 6 conditions: 3 exact matches + 3 for 'john' + 3 for 'doe' = 9 total
      // But since exact matches are the same as individual terms for single words, 
      // we expect 3 (exact) + 6 (individual terms) = 9
      expect(orConditions).toHaveLength(9);
    });
  });
});