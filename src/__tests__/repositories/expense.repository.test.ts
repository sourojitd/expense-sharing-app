import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { ExpenseRepository } from '../../lib/repositories/expense.repository';
import { ExpenseCategory } from '../../lib/models/expense';

// Mock Prisma Client
const mockPrisma = {
  expense: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    findFirst: jest.fn(),
  },
  expenseSplit: {
    create: jest.fn(),
    createMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

describe('ExpenseRepository', () => {
  let expenseRepository: ExpenseRepository;

  beforeEach(() => {
    expenseRepository = new ExpenseRepository(mockPrisma);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('createExpense', () => {
    const mockExpenseData = {
      description: 'Test Expense',
      amount: 100,
      currency: 'USD',
      date: new Date('2024-01-01'),
      paidBy: 'user1',
      groupId: 'group1',
      category: ExpenseCategory.FOOD,
    };

    const mockCreatedExpense = {
      id: 'expense1',
      ...mockExpenseData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create expense successfully', async () => {
      mockPrisma.expense.create.mockResolvedValue(mockCreatedExpense);

      const result = await expenseRepository.createExpense(mockExpenseData);

      expect(result).toEqual(mockCreatedExpense);
      expect(mockPrisma.expense.create).toHaveBeenCalledWith({
        data: mockExpenseData,
      });
    });
  });

  describe('getExpenseById', () => {
    const mockExpense = {
      id: 'expense1',
      description: 'Test Expense',
      amount: 100,
      currency: 'USD',
    };

    it('should return expense if found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(mockExpense);

      const result = await expenseRepository.getExpenseById('expense1');

      expect(result).toEqual(mockExpense);
      expect(mockPrisma.expense.findUnique).toHaveBeenCalledWith({
        where: { id: 'expense1' },
      });
    });

    it('should return null if expense not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      const result = await expenseRepository.getExpenseById('expense1');

      expect(result).toBeNull();
    });
  });

  describe('getExpenseWithSplits', () => {
    const mockExpenseWithSplits = {
      id: 'expense1',
      description: 'Test Expense',
      splits: [
        {
          id: 'split1',
          userId: 'user1',
          amount: 50,
          user: { id: 'user1', name: 'User 1', email: 'user1@test.com' },
        },
      ],
      payer: { id: 'user1', name: 'User 1', email: 'user1@test.com' },
      group: { id: 'group1', name: 'Test Group' },
    };

    it('should return expense with splits', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(mockExpenseWithSplits);

      const result = await expenseRepository.getExpenseWithSplits('expense1');

      expect(result).toEqual(mockExpenseWithSplits);
      expect(mockPrisma.expense.findUnique).toHaveBeenCalledWith({
        where: { id: 'expense1' },
        include: {
          splits: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profilePicture: true,
                },
              },
            },
          },
          payer: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePicture: true,
            },
          },
          group: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });
    });
  });

  describe('updateExpense', () => {
    const mockUpdatedExpense = {
      id: 'expense1',
      description: 'Updated Expense',
      amount: 150,
    };

    const updateData = {
      description: 'Updated Expense',
      amount: 150,
    };

    it('should update expense successfully', async () => {
      mockPrisma.expense.update.mockResolvedValue(mockUpdatedExpense);

      const result = await expenseRepository.updateExpense('expense1', updateData);

      expect(result).toEqual(mockUpdatedExpense);
      expect(mockPrisma.expense.update).toHaveBeenCalledWith({
        where: { id: 'expense1' },
        data: updateData,
      });
    });
  });

  describe('deleteExpense', () => {
    it('should delete expense successfully', async () => {
      mockPrisma.expense.delete.mockResolvedValue({});

      await expenseRepository.deleteExpense('expense1');

      expect(mockPrisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense1' },
      });
    });
  });

  describe('getExpenses', () => {
    const mockExpenses = [
      {
        id: 'expense1',
        description: 'Test Expense 1',
        splits: [],
        payer: { id: 'user1', name: 'User 1' },
        group: null,
      },
      {
        id: 'expense2',
        description: 'Test Expense 2',
        splits: [],
        payer: { id: 'user2', name: 'User 2' },
        group: { id: 'group1', name: 'Test Group' },
      },
    ];

    it('should return expenses with default filters', async () => {
      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await expenseRepository.getExpenses();

      expect(result).toEqual(mockExpenses);
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { date: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should apply filters correctly', async () => {
      const filters = {
        groupId: 'group1',
        userId: 'user1',
        category: ExpenseCategory.FOOD,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
        settled: false,
        limit: 10,
        offset: 5,
      };

      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await expenseRepository.getExpenses(filters);

      expect(result).toEqual(mockExpenses);
      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
        where: {
          groupId: 'group1',
          OR: [
            { paidBy: 'user1' },
            { splits: { some: { userId: 'user1' } } },
          ],
          category: ExpenseCategory.FOOD,
          date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
          splits: {
            some: {
              settled: false,
            },
          },
        },
        include: expect.any(Object),
        orderBy: { date: 'desc' },
        take: 10,
        skip: 5,
      });
    });
  });

  describe('createExpenseSplit', () => {
    const mockSplitData = {
      expenseId: 'expense1',
      userId: 'user1',
      amount: 50,
      settled: false,
    };

    const mockCreatedSplit = {
      id: 'split1',
      ...mockSplitData,
      createdAt: new Date(),
    };

    it('should create expense split successfully', async () => {
      mockPrisma.expenseSplit.create.mockResolvedValue(mockCreatedSplit);

      const result = await expenseRepository.createExpenseSplit(mockSplitData);

      expect(result).toEqual(mockCreatedSplit);
      expect(mockPrisma.expenseSplit.create).toHaveBeenCalledWith({
        data: mockSplitData,
      });
    });
  });

  describe('createExpenseSplits', () => {
    const mockSplitsData = [
      {
        expenseId: 'expense1',
        userId: 'user1',
        amount: 50,
        settled: false,
      },
      {
        expenseId: 'expense1',
        userId: 'user2',
        amount: 50,
        settled: false,
      },
    ];

    const mockCreatedSplits = [
      { id: 'split1', ...mockSplitsData[0] },
      { id: 'split2', ...mockSplitsData[1] },
    ];

    it('should create multiple expense splits successfully', async () => {
      mockPrisma.expenseSplit.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.expenseSplit.findMany.mockResolvedValue(mockCreatedSplits);

      const result = await expenseRepository.createExpenseSplits(mockSplitsData);

      expect(result).toEqual(mockCreatedSplits);
      expect(mockPrisma.expenseSplit.createMany).toHaveBeenCalledWith({
        data: mockSplitsData,
      });
    });
  });

  describe('settleExpenseSplit', () => {
    const mockSettledSplit = {
      id: 'split1',
      expenseId: 'expense1',
      userId: 'user1',
      amount: 50,
      settled: true,
    };

    it('should settle expense split successfully', async () => {
      mockPrisma.expenseSplit.update.mockResolvedValue(mockSettledSplit);

      const result = await expenseRepository.settleExpenseSplit('split1');

      expect(result).toEqual(mockSettledSplit);
      expect(mockPrisma.expenseSplit.update).toHaveBeenCalledWith({
        where: { id: 'split1' },
        data: { settled: true },
      });
    });
  });

  describe('getUserSplits', () => {
    const mockUserSplits = [
      {
        id: 'split1',
        userId: 'user1',
        amount: 50,
        settled: false,
        expense: {
          id: 'expense1',
          description: 'Test Expense',
          payer: { id: 'user2', name: 'User 2' },
          group: { id: 'group1', name: 'Test Group' },
        },
      },
    ];

    it('should return user splits', async () => {
      mockPrisma.expenseSplit.findMany.mockResolvedValue(mockUserSplits);

      const result = await expenseRepository.getUserSplits('user1');

      expect(result).toEqual(mockUserSplits);
      expect(mockPrisma.expenseSplit.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        include: {
          expense: {
            include: {
              payer: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              group: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by settled status', async () => {
      mockPrisma.expenseSplit.findMany.mockResolvedValue(mockUserSplits);

      const result = await expenseRepository.getUserSplits('user1', false);

      expect(result).toEqual(mockUserSplits);
      expect(mockPrisma.expenseSplit.findMany).toHaveBeenCalledWith({
        where: { userId: 'user1', settled: false },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getExpenseSummary', () => {
    const mockAggregateResult = {
      _count: { id: 10 },
      _sum: { amount: { toNumber: () => 1000 } },
    };

    const mockCategoryStats = [
      { category: 'food', _sum: { amount: { toNumber: () => 600 } } },
      { category: 'transportation', _sum: { amount: { toNumber: () => 400 } } },
    ];

    const mockMonthlyStats = [
      { date: new Date('2024-01-15'), _sum: { amount: { toNumber: () => 500 } } },
      { date: new Date('2024-02-15'), _sum: { amount: { toNumber: () => 500 } } },
    ];

    beforeEach(() => {
      mockPrisma.expense.aggregate.mockResolvedValue(mockAggregateResult);
      mockPrisma.expense.groupBy
        .mockResolvedValueOnce(mockCategoryStats)
        .mockResolvedValueOnce(mockMonthlyStats);
    });

    it('should return expense summary', async () => {
      const result = await expenseRepository.getExpenseSummary();

      expect(result).toEqual({
        totalExpenses: 10,
        totalAmount: 1000,
        currency: 'USD',
        categoryBreakdown: {
          food: 600,
          transportation: 400,
        },
        monthlyTrend: [
          { month: '2024-01', amount: 500 },
          { month: '2024-02', amount: 500 },
        ],
      });
    });

    it('should apply filters to summary', async () => {
      const filters = {
        groupId: 'group1',
        userId: 'user1',
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
      };

      await expenseRepository.getExpenseSummary(filters);

      expect(mockPrisma.expense.aggregate).toHaveBeenCalledWith({
        where: {
          groupId: 'group1',
          OR: [
            { paidBy: 'user1' },
            { splits: { some: { userId: 'user1' } } },
          ],
          date: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31'),
          },
        },
        _count: { id: true },
        _sum: { amount: true },
      });
    });
  });

  describe('checkUserCanAccessExpense', () => {
    it('should return true if user can access expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue({ id: 'expense1' });

      const result = await expenseRepository.checkUserCanAccessExpense('expense1', 'user1');

      expect(result).toBe(true);
      expect(mockPrisma.expense.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'expense1',
          OR: [
            { paidBy: 'user1' },
            { splits: { some: { userId: 'user1' } } },
            {
              group: {
                OR: [
                  { createdBy: 'user1' },
                  { members: { some: { userId: 'user1' } } },
                ],
              },
            },
          ],
        },
      });
    });

    it('should return false if user cannot access expense', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(null);

      const result = await expenseRepository.checkUserCanAccessExpense('expense1', 'user2');

      expect(result).toBe(false);
    });
  });

  describe('checkExpenseExists', () => {
    it('should return true if expense exists', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue({ id: 'expense1' });

      const result = await expenseRepository.checkExpenseExists('expense1');

      expect(result).toBe(true);
      expect(mockPrisma.expense.findUnique).toHaveBeenCalledWith({
        where: { id: 'expense1' },
        select: { id: true },
      });
    });

    it('should return false if expense does not exist', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      const result = await expenseRepository.checkExpenseExists('expense1');

      expect(result).toBe(false);
    });
  });
});