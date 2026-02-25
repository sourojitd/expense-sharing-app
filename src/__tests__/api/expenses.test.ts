/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { GET as getExpenses, POST as createExpense } from '../../app/api/expenses/route';
import { GET as getExpense, PUT as updateExpense, DELETE as deleteExpense } from '../../app/api/expenses/[expenseId]/route';
import { POST as settleExpenseSplit, DELETE as unsettleExpenseSplit } from '../../app/api/expenses/splits/[splitId]/settle/route';
import { GET as getUserExpenses } from '../../app/api/expenses/user/route';
import { GET as getUserSplits } from '../../app/api/expenses/user/splits/route';
import { GET as getExpenseSummary } from '../../app/api/expenses/summary/route';
import { setAuthService } from '../../lib/middleware/auth.middleware';
import { SplitType, ExpenseCategory } from '../../lib/models/expense';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock Prisma
jest.mock('@prisma/client');
const mockPrisma = {
  expense: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  expenseSplit: {
    create: jest.fn(),
    createMany: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
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

describe('Expense API Endpoints', () => {
  const mockUser = {
    userId: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test@example.com',
  };

  const mockExpense = {
    id: 'expense-1',
    description: 'Test Expense',
    amount: 100,
    currency: 'USD',
    date: new Date('2024-01-01'),
    paidBy: 'user-1',
    groupId: 'group-1',
    category: ExpenseCategory.FOOD,
    receipt: null,
    notes: 'Test notes',
    createdAt: new Date(),
    updatedAt: new Date(),
    splits: [
      {
        id: 'split-1',
        expenseId: 'expense-1',
        userId: 'user-1',
        amount: 50,
        percentage: null,
        shares: null,
        settled: false,
        createdAt: new Date(),
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          profilePicture: null,
        },
      },
      {
        id: 'split-2',
        expenseId: 'expense-1',
        userId: 'user-2',
        amount: 50,
        percentage: null,
        shares: null,
        settled: false,
        createdAt: new Date(),
        user: {
          id: 'user-2',
          name: 'Test User 2',
          email: 'test2@example.com',
          profilePicture: null,
        },
      },
    ],
    payer: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      profilePicture: null,
    },
    group: {
      id: 'group-1',
      name: 'Test Group',
      image: null,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setAuthService(mockAuthService);
    mockAuthService.verifyAccessToken.mockResolvedValue(mockUser);
  });

  describe('GET /api/expenses', () => {
    it('should get expenses with filters', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([mockExpense]);

      const request = new NextRequest('http://localhost:3000/api/expenses?groupId=group-1&limit=10', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await getExpenses(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expenses).toEqual([mockExpense]);
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            groupId: 'group-1',
          }),
          take: 10,
        })
      );
    });

    it('should return 401 without valid token', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        headers: { authorization: 'Bearer invalid-token' },
      });

      const response = await getExpenses(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });
  });

  describe('POST /api/expenses', () => {
    const createExpenseData = {
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

    it('should create expense successfully', async () => {
      // Mock group membership check
      mockPrisma.groupMember.mockResolvedValue({ userId: 'user-1', groupId: 'group-1' });
      
      // Mock user validation
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-1' },
        { id: 'user-2' },
      ]);

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          expense: {
            create: jest.fn().mockResolvedValue({ id: 'expense-1', ...createExpenseData }),
          },
          expenseSplit: {
            createMany: jest.fn(),
          },
          expense: {
            findUnique: jest.fn().mockResolvedValue(mockExpense),
          },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(createExpenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('Expense created successfully');
      expect(data.expense).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        description: 'Test Expense',
        // Missing required fields
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(incompleteData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });
  });

  describe('GET /api/expenses/[expenseId]', () => {
    it('should get expense by ID', async () => {
      // Mock access check
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrisma.expense.findUnique.mockResolvedValue(mockExpense);

      const request = new NextRequest('http://localhost:3000/api/expenses/expense-1', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await getExpense(request, { params: { expenseId: 'expense-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expense).toEqual(mockExpense);
    });

    it('should return 404 for non-existent expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(null);
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/expenses/non-existent', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await getExpense(request, { params: { expenseId: 'non-existent' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Expense not found');
    });
  });

  describe('PUT /api/expenses/[expenseId]', () => {
    const updateData = {
      description: 'Updated Expense',
      amount: 150,
    };

    it('should update expense successfully', async () => {
      // Mock access check
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrisma.expense.findUnique.mockResolvedValue(mockExpense);

      // Mock transaction
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback({
          expense: {
            update: jest.fn().mockResolvedValue({ ...mockExpense, ...updateData }),
            findUnique: jest.fn().mockResolvedValue({ ...mockExpense, ...updateData }),
          },
        });
      });

      const request = new NextRequest('http://localhost:3000/api/expenses/expense-1', {
        method: 'PUT',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const response = await updateExpense(request, { params: { expenseId: 'expense-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Expense updated successfully');
      expect(data.expense).toBeDefined();
    });
  });

  describe('DELETE /api/expenses/[expenseId]', () => {
    it('should delete expense successfully', async () => {
      // Mock access check
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrisma.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrisma.expense.delete.mockResolvedValue(mockExpense);

      const request = new NextRequest('http://localhost:3000/api/expenses/expense-1', {
        method: 'DELETE',
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await deleteExpense(request, { params: { expenseId: 'expense-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Expense deleted successfully');
    });
  });

  describe('POST /api/expenses/splits/[splitId]/settle', () => {
    it('should settle expense split successfully', async () => {
      const mockSplit = {
        id: 'split-1',
        expenseId: 'expense-1',
        userId: 'user-1',
        amount: 50,
        settled: false,
        expense: mockExpense,
      };

      mockPrisma.expenseSplit.findUnique.mockResolvedValue(mockSplit);
      mockPrisma.expenseSplit.update.mockResolvedValue({ ...mockSplit, settled: true });

      const request = new NextRequest('http://localhost:3000/api/expenses/splits/split-1/settle', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await settleExpenseSplit(request, { params: { splitId: 'split-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Expense split settled successfully');
      expect(data.split.settled).toBe(true);
    });
  });

  describe('DELETE /api/expenses/splits/[splitId]/settle', () => {
    it('should unsettle expense split successfully', async () => {
      const mockSplit = {
        id: 'split-1',
        expenseId: 'expense-1',
        userId: 'user-1',
        amount: 50,
        settled: true,
        expense: mockExpense,
      };

      mockPrisma.expenseSplit.findUnique.mockResolvedValue(mockSplit);
      mockPrisma.expenseSplit.update.mockResolvedValue({ ...mockSplit, settled: false });

      const request = new NextRequest('http://localhost:3000/api/expenses/splits/split-1/settle', {
        method: 'DELETE',
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await unsettleExpenseSplit(request, { params: { splitId: 'split-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Expense split unsettled successfully');
      expect(data.split.settled).toBe(false);
    });
  });

  describe('GET /api/expenses/user', () => {
    it('should get user expenses', async () => {
      mockPrisma.expense.findMany.mockResolvedValue([mockExpense]);

      const request = new NextRequest('http://localhost:3000/api/expenses/user?limit=10', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await getUserExpenses(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.expenses).toEqual([mockExpense]);
    });
  });

  describe('GET /api/expenses/user/splits', () => {
    it('should get user splits', async () => {
      const mockSplits = [mockExpense.splits[0]];
      mockPrisma.expenseSplit.findMany.mockResolvedValue(mockSplits);

      const request = new NextRequest('http://localhost:3000/api/expenses/user/splits?settled=false', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await getUserSplits(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.splits).toEqual(mockSplits);
    });
  });

  describe('GET /api/expenses/summary', () => {
    it('should get expense summary', async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const mockSummary = {
        totalExpenses: 5,
        totalAmount: 500,
        currency: 'USD',
        categoryBreakdown: {
          food: 300,
          transportation: 200,
        },
        monthlyTrend: [
          { month: '2024-01', amount: 300 },
          { month: '2024-02', amount: 200 },
        ],
      };

      mockPrisma.expense.aggregate.mockResolvedValue({
        _count: { id: 5 },
        _sum: { amount: 500 },
      });

      mockPrisma.expense.groupBy.mockResolvedValueOnce([
        { category: 'food', _sum: { amount: 300 } },
        { category: 'transportation', _sum: { amount: 200 } },
      ]).mockResolvedValueOnce([
        { date: new Date('2024-01-15'), _sum: { amount: 300 } },
        { date: new Date('2024-02-15'), _sum: { amount: 200 } },
      ]);

      const request = new NextRequest('http://localhost:3000/api/expenses/summary', {
        headers: { authorization: 'Bearer valid-token' },
      });

      const response = await getExpenseSummary(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary).toBeDefined();
      expect(data.summary.totalExpenses).toBe(5);
      expect(data.summary.totalAmount).toBe(500);
    });
  });
});