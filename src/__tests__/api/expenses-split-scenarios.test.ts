/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { POST as createExpense } from '../../app/api/expenses/route';
import { setAuthService } from '../../lib/middleware/auth.middleware';
import { SplitType, ExpenseCategory } from '../../lib/models/expense';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  expense: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  expenseSplit: {
    createMany: jest.fn(),
  },
  group: {
    findFirst: jest.fn(),
  },
  groupMember: {
    findUnique: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as any;

(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

// Mock AuthService
const mockAuthService = {
  verifyAccessToken: jest.fn(),
} as any;

describe('Expense API - Split Scenarios', () => {
  const mockUser = {
    userId: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setAuthService(mockAuthService);
    mockAuthService.verifyAccessToken.mockResolvedValue(mockUser);
    
    // Mock group membership check
    mockPrisma.groupMember.findUnique.mockResolvedValue({ userId: 'user-1', groupId: 'group-1' });
    
    // Mock user validation
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'user-1' },
      { id: 'user-2' },
      { id: 'user-3' },
    ]);
  });

  describe('Equal Split Scenario', () => {
    it('should create expense with equal split', async () => {
      const expenseData = {
        description: 'Dinner at Restaurant',
        amount: 120,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: '550e8400-e29b-41d4-a716-446655440001',
        groupId: '550e8400-e29b-41d4-a716-446655440002',
        category: ExpenseCategory.FOOD,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: '550e8400-e29b-41d4-a716-446655440001' },
          { userId: '550e8400-e29b-41d4-a716-446655440003' },
          { userId: '550e8400-e29b-41d4-a716-446655440004' },
        ],
      };

      const expectedExpense = {
        id: 'expense-1',
        ...expenseData,
        splits: [
          { userId: 'user-1', amount: 40 },
          { userId: 'user-2', amount: 40 },
          { userId: 'user-3', amount: 40 },
        ],
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          expense: {
            create: jest.fn().mockResolvedValue({ id: 'expense-1', ...expenseData }),
          },
          expenseSplit: {
            createMany: jest.fn().mockImplementation(({ data }) => {
              // Verify equal split calculation
              expect(data).toHaveLength(3);
              expect(data[0].amount).toBe(40);
              expect(data[1].amount).toBe(40);
              expect(data[2].amount).toBe(40);
            }),
          },
          expense: {
            findUnique: jest.fn().mockResolvedValue(expectedExpense),
          },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.expense).toBeDefined();
    });
  });

  describe('Exact Amount Split Scenario', () => {
    it('should create expense with exact amounts', async () => {
      const expenseData = {
        description: 'Shopping Trip',
        amount: 100,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: 'user-1',
        groupId: 'group-1',
        category: ExpenseCategory.SHOPPING,
        splitType: SplitType.EXACT,
        participants: [
          { userId: 'user-1', amount: 30 },
          { userId: 'user-2', amount: 45 },
          { userId: 'user-3', amount: 25 },
        ],
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          expense: {
            create: jest.fn().mockResolvedValue({ id: 'expense-1', ...expenseData }),
          },
          expenseSplit: {
            createMany: jest.fn().mockImplementation(({ data }) => {
              // Verify exact amounts
              expect(data).toHaveLength(3);
              expect(data.find(s => s.userId === 'user-1')?.amount).toBe(30);
              expect(data.find(s => s.userId === 'user-2')?.amount).toBe(45);
              expect(data.find(s => s.userId === 'user-3')?.amount).toBe(25);
            }),
          },
          expense: {
            findUnique: jest.fn().mockResolvedValue({ id: 'expense-1', ...expenseData }),
          },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.expense).toBeDefined();
    });

    it('should reject exact amounts that do not sum to total', async () => {
      const expenseData = {
        description: 'Shopping Trip',
        amount: 100,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: 'user-1',
        groupId: 'group-1',
        category: ExpenseCategory.SHOPPING,
        splitType: SplitType.EXACT,
        participants: [
          { userId: 'user-1', amount: 30 },
          { userId: 'user-2', amount: 45 },
          { userId: 'user-3', amount: 30 }, // Total = 105, not 100
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Split amounts');
    });
  });

  describe('Percentage Split Scenario', () => {
    it('should create expense with percentage split', async () => {
      const expenseData = {
        description: 'Utility Bill',
        amount: 200,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: 'user-1',
        groupId: 'group-1',
        category: ExpenseCategory.UTILITIES,
        splitType: SplitType.PERCENTAGE,
        participants: [
          { userId: 'user-1', percentage: 50 },
          { userId: 'user-2', percentage: 30 },
          { userId: 'user-3', percentage: 20 },
        ],
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          expense: {
            create: jest.fn().mockResolvedValue({ id: 'expense-1', ...expenseData }),
          },
          expenseSplit: {
            createMany: jest.fn().mockImplementation(({ data }) => {
              // Verify percentage calculations
              expect(data).toHaveLength(3);
              expect(data.find(s => s.userId === 'user-1')?.amount).toBe(100); // 50% of 200
              expect(data.find(s => s.userId === 'user-2')?.amount).toBe(60);  // 30% of 200
              expect(data.find(s => s.userId === 'user-3')?.amount).toBe(40);  // 20% of 200
            }),
          },
          expense: {
            findUnique: jest.fn().mockResolvedValue({ id: 'expense-1', ...expenseData }),
          },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.expense).toBeDefined();
    });

    it('should reject percentages that do not sum to 100%', async () => {
      const expenseData = {
        description: 'Utility Bill',
        amount: 200,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: 'user-1',
        groupId: 'group-1',
        category: ExpenseCategory.UTILITIES,
        splitType: SplitType.PERCENTAGE,
        participants: [
          { userId: 'user-1', percentage: 50 },
          { userId: 'user-2', percentage: 30 },
          { userId: 'user-3', percentage: 30 }, // Total = 110%, not 100%
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Split percentages');
    });
  });

  describe('Shares Split Scenario', () => {
    it('should create expense with shares split', async () => {
      const expenseData = {
        description: 'Group Vacation',
        amount: 600,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: 'user-1',
        groupId: 'group-1',
        category: ExpenseCategory.ACCOMMODATION,
        splitType: SplitType.SHARES,
        participants: [
          { userId: 'user-1', shares: 3 }, // 3/6 = 50% = 300
          { userId: 'user-2', shares: 2 }, // 2/6 = 33.33% = 200
          { userId: 'user-3', shares: 1 }, // 1/6 = 16.67% = 100
        ],
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          expense: {
            create: jest.fn().mockResolvedValue({ id: 'expense-1', ...expenseData }),
          },
          expenseSplit: {
            createMany: jest.fn().mockImplementation(({ data }) => {
              // Verify shares calculations
              expect(data).toHaveLength(3);
              expect(data.find(s => s.userId === 'user-1')?.amount).toBe(300); // 3/6 of 600
              expect(data.find(s => s.userId === 'user-2')?.amount).toBe(200); // 2/6 of 600
              expect(data.find(s => s.userId === 'user-3')?.amount).toBe(100); // 1/6 of 600
            }),
          },
          expense: {
            findUnique: jest.fn().mockResolvedValue({ id: 'expense-1', ...expenseData }),
          },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.expense).toBeDefined();
    });
  });

  describe('Group Validation Scenarios', () => {
    it('should reject expense if user is not a group member', async () => {
      // Mock user not being a group member
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      const expenseData = {
        description: 'Test Expense',
        amount: 100,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: 'user-1',
        groupId: 'group-1',
        category: ExpenseCategory.FOOD,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: 'user-1' },
          { userId: 'user-2' },
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not a member of this group');
    });

    it('should reject expense if participant is not a group member', async () => {
      // Mock only some users being group members
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
        { id: 'user-3' }, // This user exists but is not a group member
      ]);

      // Mock group membership check - user-3 is not a member
      mockPrisma.groupMember.findUnique
        .mockResolvedValueOnce({ userId: 'user-1', groupId: 'group-1' }) // Creator check
        .mockResolvedValueOnce({ userId: 'user-1', groupId: 'group-1' }) // user-1 member check
        .mockResolvedValueOnce({ userId: 'user-2', groupId: 'group-1' }) // user-2 member check
        .mockResolvedValueOnce(null); // user-3 not a member

      const expenseData = {
        description: 'Test Expense',
        amount: 150,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: 'user-1',
        groupId: 'group-1',
        category: ExpenseCategory.FOOD,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: 'user-1' },
          { userId: 'user-2' },
          { userId: 'user-3' }, // Not a group member
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('not a member of the group');
    });
  });

  describe('Personal Expense Scenarios', () => {
    it('should create personal expense (no group)', async () => {
      const expenseData = {
        description: 'Personal Lunch',
        amount: 25,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: 'user-1',
        // No groupId for personal expense
        category: ExpenseCategory.FOOD,
        splitType: SplitType.EQUAL,
        participants: [
          { userId: 'user-1' },
          { userId: 'user-2' }, // Friend expense
        ],
      };

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          expense: {
            create: jest.fn().mockResolvedValue({ id: 'expense-1', ...expenseData }),
          },
          expenseSplit: {
            createMany: jest.fn().mockImplementation(({ data }) => {
              expect(data).toHaveLength(2);
              expect(data[0].amount).toBe(12.5);
              expect(data[1].amount).toBe(12.5);
            }),
          },
          expense: {
            findUnique: jest.fn().mockResolvedValue({ id: 'expense-1', ...expenseData }),
          },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.expense).toBeDefined();
    });
  });
});