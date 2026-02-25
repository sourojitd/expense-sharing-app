import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { ExpenseService } from '../../lib/services/expense.service';
import { SplitType } from '../../lib/models/expense';

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

describe('ExpenseService - Core Functionality', () => {
  let expenseService: ExpenseService;

  beforeEach(() => {
    expenseService = new ExpenseService(mockPrisma);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
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

    it('should throw error for invalid exact amounts', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001', amount: 60 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', amount: 50 }, // Total 110, but expense is 100
      ];

      expect(() => {
        expenseService.calculateSplitAmounts(100, SplitType.EXACT, participants);
      }).toThrow('Split amounts (110) do not equal total amount (100)');
    });

    it('should throw error for invalid percentages', () => {
      const participants = [
        { userId: '550e8400-e29b-41d4-a716-446655440001', percentage: 60 },
        { userId: '550e8400-e29b-41d4-a716-446655440002', percentage: 50 }, // Total 110%
      ];

      expect(() => {
        expenseService.calculateSplitAmounts(100, SplitType.PERCENTAGE, participants);
      }).toThrow('Split percentages (110%) do not equal 100%');
    });
  });

  describe('settleExpenseSplit', () => {
    const mockSplit = {
      id: '550e8400-e29b-41d4-a716-446655440020',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      expense: { paidBy: '550e8400-e29b-41d4-a716-446655440002' },
    };

    beforeEach(() => {
      mockPrisma.expenseSplit.findUnique.mockResolvedValue(mockSplit);
      mockPrisma.expenseSplit.update.mockResolvedValue({ ...mockSplit, settled: true });
    });

    it('should settle split if user owns the split', async () => {
      const result = await expenseService.settleExpenseSplit('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001');

      expect(result.settled).toBe(true);
      expect(mockPrisma.expenseSplit.update).toHaveBeenCalledWith({
        where: { id: '550e8400-e29b-41d4-a716-446655440020' },
        data: { settled: true },
      });
    });

    it('should settle split if user is the payer', async () => {
      const result = await expenseService.settleExpenseSplit('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440002');

      expect(result.settled).toBe(true);
    });

    it('should throw error if user cannot settle split', async () => {
      await expect(
        expenseService.settleExpenseSplit('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440099')
      ).rejects.toThrow('Access denied: You can only settle your own splits or splits owed to you');
    });

    it('should throw error if split not found', async () => {
      mockPrisma.expenseSplit.findUnique.mockResolvedValue(null);

      await expect(
        expenseService.settleExpenseSplit('550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440001')
      ).rejects.toThrow('Expense split not found');
    });
  });

  describe('getExpenses', () => {
    const mockExpenses = [
      {
        id: '550e8400-e29b-41d4-a716-446655440010',
        description: 'Test Expense 1',
        amount: { toNumber: () => 100 },
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440011',
        description: 'Test Expense 2',
        amount: { toNumber: () => 200 },
      },
    ];

    beforeEach(() => {
      mockPrisma.expense.findMany.mockResolvedValue(mockExpenses);
      mockPrisma.group.findFirst.mockResolvedValue({ id: '550e8400-e29b-41d4-a716-446655440002', createdBy: '550e8400-e29b-41d4-a716-446655440001' });
    });

    it('should return expenses for user', async () => {
      const result = await expenseService.getExpenses({}, '550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual(mockExpenses);
      expect(mockPrisma.expense.findMany).toHaveBeenCalled();
    });

    it('should validate group access when groupId is provided', async () => {
      const result = await expenseService.getExpenses({ groupId: '550e8400-e29b-41d4-a716-446655440002' }, '550e8400-e29b-41d4-a716-446655440001');

      expect(result).toEqual(mockExpenses);
    });

    it('should throw error if user is not group member', async () => {
      mockPrisma.group.findFirst.mockResolvedValue(null);
      mockPrisma.groupMember.findUnique.mockResolvedValue(null);

      await expect(
        expenseService.getExpenses({ groupId: '550e8400-e29b-41d4-a716-446655440002' }, '550e8400-e29b-41d4-a716-446655440099')
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
      const result = await expenseService.getExpenseSummary({}, '550e8400-e29b-41d4-a716-446655440001');

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