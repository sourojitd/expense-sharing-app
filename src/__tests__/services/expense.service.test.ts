import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { ExpenseService } from '../../lib/services/expense.service';
import { SplitType, ExpenseCategory } from '../../lib/models/expense';

// Mock Prisma Client
const mockPrisma = {
  expense: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
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
  group: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  groupMember: {
    findUnique: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaClient;

describe('ExpenseService', () => {
  let expenseService: ExpenseService;

  beforeEach(() => {
    expenseService = new ExpenseService(mockPrisma);
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
      paidBy: '550e8400-e29b-41d4-a716-446655440001',
      groupId: '550e8400-e29b-41d4-a716-446655440002',
      category: ExpenseCategory.FOOD,
      splitType: SplitType.EQUAL,
      participants: [
        { userId: '550e8400-e29b-41d4-a716-446655440001' },
        { userId: '550e8400-e29b-41d4-a716-446655440003' },
      ],
    };

    const mockCreatedExpense = {
      id: '550e8400-e29b-41d4-a716-446655440010',
      ...mockExpenseData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockExpenseWithSplits = {
      ...mockCreatedExpense,
      splits: [
        {
          id: '550e8400-e29b-41d4-a716-446655440020',
          expenseId: '550e8400-e29b-41d4-a716-446655440010',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          amount: { toNumber: () => 50 },
          settled: false,
          user: { id: '550e8400-e29b-41d4-a716-446655440001', name: 'User 1', email: 'user1@test.com' },
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440021',
          expenseId: '550e8400-e29b-41d4-a716-446655440010',
          userId: '550e8400-e29b-41d4-a716-446655440003',
          amount: { toNumber: () => 50 },
          settled: false,
          user: { id: '550e8400-e29b-41d4-a716-446655440003', name: 'User 2', email: 'user2@test.com' },
        },
      ],
      payer: { id: '550e8400-e29b-41d4-a716-446655440001', name: 'User 1', email: 'user1@test.com' },
      group: { id: '550e8400-e29b-41d4-a716-446655440002', name: 'Test Group' },
    };

    beforeEach(() => {
      // Mock group membership validation
      mockPrisma.group.findFirst.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440002', createdBy: '550e8400-e29b-41d4-a716-446655440001' });
      mockPrisma.groupMember.findUnique.mockResolvedValue({ groupId: '550e8400-e29b-41d4-a716-446655440002', userId: '550e8400-e29b-41d4-a716-446655440001', role: 'member' });
      
      // Mock user validation
      mockPrisma.user.findMany.mockResolvedValue([
        { id: '550e8400-e29b-41d4-a716-446655440001' },
        { id: '550e8400-e29b-41d4-a716-446655440003' },
      ]);

      // Mock transaction
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          expense: {
            create: jest.fn().mockResolvedValue(mockCreatedExpense),
            findUnique: jest.fn().mockResolvedValue(mockExpenseWithSplits),
          },
          expenseSplit: {
            createMany: jest.fn().mockResolvedValue({ count: 2 }),
          },
        };
        return await callback(txMock);
      });
    });

    it('should create expense with equal split', async () => {
      const result = await expenseService.createExpense(mockExpenseData, '550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual(mockExpenseWithSplits);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if user is not group member', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(null);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(
        expenseService.createExpense(mockExpenseData, '550e8400-e29b-41d4-a716-446655440099')
      ).rejects.toThrow('Access denied: You are not a member of this group');
    });

    it('should throw error if participants are invalid', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001' }]); // Missing user2

      await expect(
        expenseService.createExpense(mockExpenseData, '550e8400-e29b-41d4-a716-446655440001')
      ).rejects.toThrow('One or more participants are invalid users');
    });

    it('should create expense with exact amounts', async () => {
      const exactSplitData = {
        ...mockExpenseData,
        splitType: SplitType.EXACT,
        participants: [
          { userId: '550e8400-e29b-41d4-a716-446655440001', amount: 60 },
          { userId: '550e8400-e29b-41d4-a716-446655440003', amount: 40 },
        ],
      };

      const result = await expenseService.createExpense(exactSplitData, '550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual(mockExpenseWithSplits);
    });

    it('should throw error for invalid exact amounts', async () => {
      const invalidExactSplitData = {
        ...mockExpenseData,
        splitType: SplitType.EXACT,
        participants: [
          { userId: '550e8400-e29b-41d4-a716-446655440001', amount: 60 },
          { userId: '550e8400-e29b-41d4-a716-446655440003', amount: 50 }, // Total 110, but expense is 100
        ],
      };

      await expect(
        expenseService.createExpense(invalidExactSplitData, '550e8400-e29b-41d4-a716-446655440001')
      ).rejects.toThrow('Split amounts (110) do not equal total amount (100)');
    });

    it('should create expense with percentage split', async () => {
      const percentageSplitData = {
        ...mockExpenseData,
        splitType: SplitType.PERCENTAGE,
        participants: [
          { userId: '550e8400-e29b-41d4-a716-446655440001', percentage: 60 },
          { userId: '550e8400-e29b-41d4-a716-446655440003', percentage: 40 },
        ],
      };

      const result = await expenseService.createExpense(percentageSplitData, '550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual(mockExpenseWithSplits);
    });

    it('should throw error for invalid percentages', async () => {
      const invalidPercentageSplitData = {
        ...mockExpenseData,
        splitType: SplitType.PERCENTAGE,
        participants: [
          { userId: '550e8400-e29b-41d4-a716-446655440001', percentage: 60 },
          { userId: '550e8400-e29b-41d4-a716-446655440003', percentage: 50 }, // Total 110%
        ],
      };

      await expect(
        expenseService.createExpense(invalidPercentageSplitData, '550e8400-e29b-41d4-a716-446655440001')
      ).rejects.toThrow('Split percentages (110%) do not equal 100%');
    });

    it('should create expense with shares split', async () => {
      const sharesSplitData = {
        ...mockExpenseData,
        splitType: SplitType.SHARES,
        participants: [
          { userId: '550e8400-e29b-41d4-a716-446655440001', shares: 3 },
          { userId: '550e8400-e29b-41d4-a716-446655440003', shares: 2 },
        ],
      };

      const result = await expenseService.createExpense(sharesSplitData, '550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual(mockExpenseWithSplits);
    });
  });

  describe('calculateSplitAmounts', () => {
    it('should calculate equal split correctly', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001' },
        { userId: '550e8400-e29b-41d4-a716-446655440002' },
        { userId: '550e8400-e29b-41d4-a716-446655440003' },
      ];

      const result = expenseService.calculateSplitAmounts(100, SplitType.EQUAL, participants);

      expect(result).toEqual([
        { userId: '550e8400-e29b-41d4-a716-446655440001', amount: 33.33 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', amount: 33.33 },
        { userId: '550e8400-e29b-41d4-a716-446655440003', amount: 33.33 },
      ]);
    });

    it('should calculate exact split correctly', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001', amount: 60 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', amount: 40 },
      ];

      const result = expenseService.calculateSplitAmounts(100, SplitType.EXACT, participants);

      expect(result).toEqual([
        { userId: '550e8400-e29b-41d4-a716-446655440001', amount: 60 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', amount: 40 },
      ]);
    });

    it('should calculate percentage split correctly', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001', percentage: 60 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', percentage: 40 },
      ];

      const result = expenseService.calculateSplitAmounts(100, SplitType.PERCENTAGE, participants);

      expect(result).toEqual([
        { userId: '550e8400-e29b-41d4-a716-446655440001', amount: 60, percentage: 60 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', amount: 40, percentage: 40 },
      ]);
    });

    it('should calculate shares split correctly', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001', shares: 3 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', shares: 2 },
      ];

      const result = expenseService.calculateSplitAmounts(100, SplitType.SHARES, participants);

      expect(result).toEqual([
        { userId: '550e8400-e29b-41d4-a716-446655440001', amount: 60, shares: 3 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', amount: 40, shares: 2 },
      ]);
    });

    it('should throw error for exact split without amounts', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001' },
        { userId: '550e8400-e29b-41d4-a716-446655440002' },
      ];

      expect(() => {
        expenseService.calculateSplitAmounts(100, SplitType.EXACT, participants);
      }).toThrow('All participants must have exact amounts specified');
    });

    it('should throw error for percentage split without percentages', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001' },
        { userId: '550e8400-e29b-41d4-a716-446655440002' },
      ];

      expect(() => {
        expenseService.calculateSplitAmounts(100, SplitType.PERCENTAGE, participants);
      }).toThrow('All participants must have percentages specified');
    });

    it('should throw error for shares split without shares', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001' },
        { userId: '550e8400-e29b-41d4-a716-446655440002' },
      ];

      expect(() => {
        expenseService.calculateSplitAmounts(100, SplitType.SHARES, participants);
      }).toThrow('All participants must have shares specified');
    });

    it('should throw error for zero total shares', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001', shares: 0 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', shares: 0 },
      ];

      expect(() => {
        expenseService.calculateSplitAmounts(100, SplitType.SHARES, participants);
      }).toThrow('Total shares cannot be zero');
    });
  });

  describe('getExpenseById', () => {
    const mockExpense = {
      id: 'expense1',
      description: 'Test Expense',
      amount: { toNumber: () => 100 },
      paidBy: 'user1',
      splits: [],
    };

    it('should return expense if user has access', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrisma.expense.findUnique.mockResolvedValue(mockExpense);

      const result = await expenseService.getExpenseById('expense1', 'user1');

      expect(result).toEqual(mockExpense);
    });

    it('should throw error if user does not have access', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(null);

      await expect(
        expenseService.getExpenseById('expense1', 'user2')
      ).rejects.toThrow('Access denied: You do not have permission to view this expense');
    });
  });

  describe('updateExpense', () => {
    const mockExpense = {
      id: 'expense1',
      description: 'Test Expense',
      amount: { toNumber: () => 100 },
      paidBy: 'user1',
      groupId: 'group1',
      splits: [],
    };

    const updateData = {
      description: 'Updated Expense',
      amount: 150,
    };

    beforeEach(() => {
      mockPrisma.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
        const txMock = {
          expense: {
            update: jest.fn().mockResolvedValue({ ...mockExpense, ...updateData }),
            findUnique: jest.fn().mockResolvedValue({ ...mockExpense, ...updateData }),
          },
          expenseSplit: {
            deleteMany: jest.fn(),
            createMany: jest.fn(),
          },
        };
        return await callback(txMock);
      });
    });

    it('should update expense successfully', async () => {
      const result = await expenseService.updateExpense('expense1', updateData, 'user1');

      expect(result.description).toBe('Updated Expense');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error if expense not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      await expect(
        expenseService.updateExpense('expense1', updateData, 'user1')
      ).rejects.toThrow('Expense not found');
    });

    it('should throw error if user does not have access', async () => {
      mockPrisma.expense.findFirst.mockResolvedValue(null);

      await expect(
        expenseService.updateExpense('expense1', updateData, 'user2')
      ).rejects.toThrow('Access denied: You do not have permission to update this expense');
    });
  });

  describe('deleteExpense', () => {
    const mockExpense = {
      id: 'expense1',
      paidBy: 'user1',
      groupId: 'group1',
    };

    beforeEach(() => {
      mockPrisma.expense.findUnique.mockResolvedValue(mockExpense);
      mockPrisma.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrisma.expense.delete.mockResolvedValue(mockExpense);
    });

    it('should delete expense if user is payer', async () => {
      await expenseService.deleteExpense('expense1', 'user1');

      expect(mockPrisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense1' },
      });
    });

    it('should delete expense if user is group admin', async () => {
      mockPrisma.group.findFirst.mockResolvedValue({ id: 'group1', createdBy: 'user2' });

      await expenseService.deleteExpense('expense1', 'user2');

      expect(mockPrisma.expense.delete).toHaveBeenCalledWith({
        where: { id: 'expense1' },
      });
    });

    it('should throw error if user is not payer or admin', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(null);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(
        expenseService.deleteExpense('expense1', 'user3')
      ).rejects.toThrow('Access denied: Only the payer or group admin can delete this expense');
    });

    it('should throw error if expense not found', async () => {
      mockPrisma.expense.findUnique.mockResolvedValue(null);

      await expect(
        expenseService.deleteExpense('expense1', 'user1')
      ).rejects.toThrow('Expense not found');
    });
  });

  describe('settleExpenseSplit', () => {
    const mockSplit = {
      id: 'split1',
      userId: 'user1',
      expense: { paidBy: 'user2' },
    };

    beforeEach(() => {
      mockPrisma.expenseSplit.findUnique.mockResolvedValue(mockSplit);
      mockPrisma.expenseSplit.update.mockResolvedValue({ ...mockSplit, settled: true });
    });

    it('should settle split if user owns the split', async () => {
      const result = await expenseService.settleExpenseSplit('split1', 'user1');

      expect(result.settled).toBe(true);
      expect(mockPrisma.expenseSplit.update).toHaveBeenCalledWith({
        where: { id: 'split1' },
        data: { settled: true },
      });
    });

    it('should settle split if user is the payer', async () => {
      const result = await expenseService.settleExpenseSplit('split1', 'user2');

      expect(result.settled).toBe(true);
    });

    it('should throw error if user cannot settle split', async () => {
      await expect(
        expenseService.settleExpenseSplit('split1', 'user3')
      ).rejects.toThrow('Access denied: You can only settle your own splits or splits owed to you');
    });

    it('should throw error if split not found', async () => {
      mockPrisma.expenseSplit.findUnique.mockResolvedValue(null);

      await expect(
        expenseService.settleExpenseSplit('split1', 'user1')
      ).rejects.toThrow('Expense split not found');
    });
  });

  describe('getExpenses', () => {
    const mockExpenses = [
      {
        id: 'expense1',
        description: 'Test Expense 1',
        amount: { toNumber: () => 100 },
      },
      {
        id: 'expense2',
        description: 'Test Expense 2',
        amount: { toNumber: () => 200 },
      },
    ];

    beforeEach(() => {
      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrisma.group.findFirst.mockResolvedValue({ id: 'group1', createdBy: 'user1' });
    });

    it('should return expenses for user', async () => {
      const result = await expenseService.getExpenses({}, 'user1');

      expect(result).toEqual(mockExpenses);
      expect(mockPrisma.expense.findMany).toHaveBeenCalled();
    });

    it('should validate group access when groupId is provided', async () => {
      const result = await expenseService.getExpenses({ groupId: 'group1' }, 'user1');

      expect(result).toEqual(mockExpenses);
    });

    it('should throw error if user is not group member', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(null);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(
        expenseService.getExpenses({ groupId: 'group1' }, 'user2')
      ).rejects.toThrow('Access denied: You are not a member of this group');
    });
  });

  describe('getExpenseSummary', () => {
    const mockSummaryData = {
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
      mockPrisma.expense.aggregate.mockResolvedValue(mockSummaryData);
      mockPrisma.expense.groupBy
        .mockResolvedValueOnce(mockCategoryStats)
        .mockResolvedValueOnce(mockMonthlyStats);
    });

    it('should return expense summary', async () => {
      const result = await expenseService.getExpenseSummary({}, 'user1');

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
  });
});