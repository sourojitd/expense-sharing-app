import { PrismaClient, User, Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { CreateUserInput, UpdateUserInput } from '../models/user';
import bcrypt from 'bcryptjs';

export class UserRepository {
  private db: PrismaClient;

  constructor(dbClient?: PrismaClient) {
    this.db = dbClient || prisma;
  }

  async createUser(userData: CreateUserInput): Promise<User> {
    const { password, ...userFields } = userData;
    const passwordHash = await bcrypt.hash(password, 12);

    try {
      const user = await this.db.user.create({
        data: {
          ...userFields,
          passwordHash,
        },
      });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('User with this email already exists');
      }
      throw error;
    }
  }

  async findUserById(id: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { id },
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async updateUser(id: string, userData: UpdateUserInput): Promise<User> {
    try {
      const user = await this.db.user.update({
        where: { id },
        data: userData,
      });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new Error('Email already in use by another user');
        }
        if (error.code === 'P2025') {
          throw new Error('User not found');
        }
      }
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      await this.db.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('User not found');
      }
      throw error;
    }
  }

  async verifyUserEmail(id: string): Promise<User> {
    try {
      const user = await this.db.user.update({
        where: { id },
        data: { emailVerified: true },
      });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('User not found');
      }
      throw error;
    }
  }

  async updatePassword(id: string, newPassword: string): Promise<User> {
    const passwordHash = await bcrypt.hash(newPassword, 12);
    
    try {
      const user = await this.db.user.update({
        where: { id },
        data: { passwordHash },
      });
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('User not found');
      }
      throw error;
    }
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return null;
    }

    return user;
  }

  async searchUsers(query: string, excludeIds: string[] = []): Promise<User[]> {
    return this.db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
            ],
          },
          {
            id: { notIn: excludeIds },
          },
        ],
      },
      take: 10, // Limit results
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
        passwordHash: false, // Exclude password hash from search results
      },
    });
  }

  async searchUsersWithFuzzyMatching(query: string, excludeIds: string[] = []): Promise<User[]> {
    // For fuzzy matching, we'll use multiple search strategies
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0);
    
    const searchConditions = searchTerms.flatMap(term => [
      { name: { contains: term, mode: 'insensitive' as const } },
      { email: { contains: term, mode: 'insensitive' as const } },
      { phone: { contains: term, mode: 'insensitive' as const } },
    ]);

    return this.db.user.findMany({
      where: {
        AND: [
          {
            OR: [
              // Exact phrase match (highest priority)
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
              // Individual term matches
              ...searchConditions,
            ],
          },
          {
            id: { notIn: excludeIds },
          },
        ],
      },
      take: 15, // Slightly more results for fuzzy matching
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
  }

  async getUserStats(id: string): Promise<{
    totalExpenses: number;
    totalGroups: number;
    totalFriends: number;
  }> {
    const [expenseCount, groupCount, friendCount] = await Promise.all([
      this.db.expense.count({
        where: { paidBy: id },
      }),
      this.db.groupMember.count({
        where: { userId: id },
      }),
      this.db.friendRequest.count({
        where: {
          OR: [
            { senderId: id, status: 'ACCEPTED' },
            { receiverId: id, status: 'ACCEPTED' },
          ],
        },
      }),
    ]);

    return {
      totalExpenses: expenseCount,
      totalGroups: groupCount,
      totalFriends: friendCount,
    };
  }

  async isEmailTaken(email: string, excludeId?: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });

    if (!user) return false;
    if (excludeId && user.id === excludeId) return false;
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getUsersWithPendingBalances(userId: string): Promise<User[]> {
    // This would be used to get users who have pending balances with the current user
    // For now, returning empty array as balance calculation will be implemented later
    return [];
  }
}