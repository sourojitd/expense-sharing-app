import { PrismaClient } from '@prisma/client';
import { RecurringExpenseService } from '../../lib/services/recurring-expense.service';
import { RecurringExpenseRepository } from '../../lib/repositories/recurring-expense.repository';

// Mock the repository module
jest.mock('../../lib/repositories/recurring-expense.repository');

const MockRecurringExpenseRepository = RecurringExpenseRepository as jest.MockedClass<typeof RecurringExpenseRepository>;

// Build a mock $transaction that executes the callback with a mock tx client
const mockTxClient = {
  expense: {
    create: jest.fn(),
  },
  expenseSplit: {
    createMany: jest.fn(),
  },
  recurringExpense: {
    update: jest.fn(),
  },
};

const mockPrisma = {
  recurringExpense: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  expense: {
    create: jest.fn(),
  },
  expenseSplit: {
    createMany: jest.fn(),
  },
  $transaction: jest.fn((cb: (tx: typeof mockTxClient) => Promise<void>) => cb(mockTxClient)),
} as unknown as PrismaClient;

describe('RecurringExpenseService', () => {
  let service: RecurringExpenseService;
  let mockRepo: jest.Mocked<RecurringExpenseRepository>;

  const baseRecurringExpense = {
    id: 'rec-1',
    description: 'Monthly Rent',
    amount: 1200,
    currency: 'USD',
    paidBy: 'user-a',
    groupId: 'group-1',
    category: 'housing',
    splitType: 'EQUAL',
    frequency: 'MONTHLY' as const,
    startDate: new Date('2024-01-01'),
    endDate: null as Date | null,
    nextDueDate: new Date('2024-02-01'),
    isActive: true,
    participantData: {
      splits: [
        { userId: 'user-a', amount: 600 },
        { userId: 'user-b', amount: 600 },
      ],
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    payer: { id: 'user-a', name: 'Alice', email: 'alice@test.com', profilePicture: null },
    group: { id: 'group-1', name: 'Roommates', image: null },
  };

  beforeEach(() => {
    MockRecurringExpenseRepository.mockClear();
    jest.clearAllMocks();

    // Restore the $transaction implementation after clearAllMocks wipes it
    (mockPrisma.$transaction as jest.Mock).mockImplementation(
      (cb: (tx: typeof mockTxClient) => Promise<void>) => cb(mockTxClient)
    );

    service = new RecurringExpenseService(mockPrisma);
    mockRepo = MockRecurringExpenseRepository.mock.instances[0] as jest.Mocked<RecurringExpenseRepository>;
  });

  describe('create', () => {
    const validCreateData = {
      description: 'Monthly Rent',
      amount: 1200,
      currency: 'USD',
      groupId: 'group-1',
      category: 'housing',
      splitType: 'EQUAL',
      frequency: 'MONTHLY' as const,
      startDate: '2024-01-01',
      participantData: {
        splits: [
          { userId: 'user-a', amount: 600 },
          { userId: 'user-b', amount: 600 },
        ],
      },
    };

    it('should successfully create a recurring expense with correct nextDueDate', async () => {
      mockRepo.create.mockResolvedValue(baseRecurringExpense);

      const result = await service.create(validCreateData, 'user-a');

      expect(result).toEqual(baseRecurringExpense);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Monthly Rent',
          amount: 1200,
          currency: 'USD',
          paidBy: 'user-a',
          groupId: 'group-1',
          category: 'housing',
          splitType: 'EQUAL',
          frequency: 'MONTHLY',
          startDate: new Date('2024-01-01'),
          nextDueDate: new Date('2024-01-01'), // nextDueDate = startDate
          participantData: validCreateData.participantData,
        })
      );
    });

    it('should reject invalid (zero) amount', async () => {
      const invalidData = { ...validCreateData, amount: 0 };

      await expect(service.create(invalidData, 'user-a')).rejects.toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should reject negative amount', async () => {
      const invalidData = { ...validCreateData, amount: -100 };

      await expect(service.create(invalidData, 'user-a')).rejects.toThrow(
        'Amount must be greater than 0'
      );
    });

    it('should reject empty participants', async () => {
      const invalidData = {
        ...validCreateData,
        participantData: { splits: [] },
      };

      await expect(service.create(invalidData, 'user-a')).rejects.toThrow(
        'At least one participant is required'
      );
    });

    it('should reject missing participantData splits', async () => {
      const invalidData = {
        ...validCreateData,
        participantData: {} as { splits: { userId: string; amount: number }[] },
      };

      await expect(service.create(invalidData, 'user-a')).rejects.toThrow(
        'At least one participant is required'
      );
    });

    it('should reject invalid frequency', async () => {
      const invalidData = {
        ...validCreateData,
        frequency: 'HOURLY' as 'MONTHLY',
      };

      await expect(service.create(invalidData, 'user-a')).rejects.toThrow(
        'Invalid frequency'
      );
    });

    it('should reject endDate before startDate', async () => {
      const invalidData = {
        ...validCreateData,
        endDate: '2023-12-01', // before start date of 2024-01-01
      };

      await expect(service.create(invalidData, 'user-a')).rejects.toThrow(
        'End date must be after start date'
      );
    });
  });

  describe('pause', () => {
    it('should set isActive to false', async () => {
      mockRepo.getById.mockResolvedValue(baseRecurringExpense);
      mockRepo.update.mockResolvedValue({ ...baseRecurringExpense, isActive: false });

      const result = await service.pause('rec-1', 'user-a');

      expect(result.isActive).toBe(false);
      expect(mockRepo.update).toHaveBeenCalledWith('rec-1', { isActive: false });
    });

    it('should throw error when recurring expense not found', async () => {
      mockRepo.getById.mockResolvedValue(null);

      await expect(service.pause('non-existent', 'user-a')).rejects.toThrow(
        'Recurring expense not found'
      );
    });

    it('should throw error when user is not the owner', async () => {
      mockRepo.getById.mockResolvedValue(baseRecurringExpense);

      await expect(service.pause('rec-1', 'user-b')).rejects.toThrow(
        'Access denied: You can only pause your own recurring expenses'
      );
    });
  });

  describe('resume', () => {
    it('should set isActive to true and recalculate nextDueDate', async () => {
      // Recurring expense was paused, nextDueDate is in the past
      const pausedExpense = {
        ...baseRecurringExpense,
        isActive: false,
        nextDueDate: new Date('2024-01-15'), // in the past
        frequency: 'MONTHLY' as const,
      };

      mockRepo.getById.mockResolvedValue(pausedExpense);
      mockRepo.update.mockResolvedValue({
        ...baseRecurringExpense,
        isActive: true,
      });

      await service.resume('rec-1', 'user-a');

      expect(mockRepo.update).toHaveBeenCalledWith('rec-1', {
        isActive: true,
        nextDueDate: expect.any(Date),
      });

      // The nextDueDate should be in the future (or today)
      const callArgs = mockRepo.update.mock.calls[0][1] as { isActive: boolean; nextDueDate: Date };
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(callArgs.nextDueDate.getTime()).toBeGreaterThanOrEqual(today.getTime());
    });

    it('should throw error when user is not the owner', async () => {
      mockRepo.getById.mockResolvedValue(baseRecurringExpense);

      await expect(service.resume('rec-1', 'user-b')).rejects.toThrow(
        'Access denied: You can only resume your own recurring expenses'
      );
    });

    it('should throw error when end date has passed', async () => {
      const expiredExpense = {
        ...baseRecurringExpense,
        isActive: false,
        endDate: new Date('2024-01-10'), // very far in the past
        nextDueDate: new Date('2024-01-05'),
        frequency: 'DAILY' as const,
      };

      mockRepo.getById.mockResolvedValue(expiredExpense);

      await expect(service.resume('rec-1', 'user-a')).rejects.toThrow(
        'Cannot resume: the end date has already passed'
      );
    });
  });

  describe('processDueExpenses', () => {
    it('should create expense records from due recurring expenses', async () => {
      const dueExpense = {
        ...baseRecurringExpense,
        id: 'rec-1',
        nextDueDate: new Date('2024-01-01'),
        frequency: 'MONTHLY' as const,
        endDate: null,
      };

      mockRepo.getDueExpenses.mockResolvedValue([dueExpense]);

      mockTxClient.expense.create.mockResolvedValue({
        id: 'exp-1',
        description: 'Monthly Rent',
        amount: 1200,
      });
      mockTxClient.expenseSplit.createMany.mockResolvedValue({ count: 2 });
      mockTxClient.recurringExpense.update.mockResolvedValue({});

      const result = await service.processDueExpenses();

      expect(result.created).toBe(1);
      expect(result.errors).toBe(0);

      // Verify expense was created with correct data
      expect(mockTxClient.expense.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Monthly Rent',
          amount: 1200,
          currency: 'USD',
          paidBy: 'user-a',
          groupId: 'group-1',
          category: 'housing',
        }),
      });

      // Verify splits were created
      expect(mockTxClient.expenseSplit.createMany).toHaveBeenCalledWith({
        data: [
          { expenseId: 'exp-1', userId: 'user-a', amount: 600, settled: false },
          { expenseId: 'exp-1', userId: 'user-b', amount: 600, settled: false },
        ],
      });
    });

    it('should advance nextDueDate correctly for each frequency', async () => {
      // Test WEEKLY frequency
      const weeklyExpense = {
        ...baseRecurringExpense,
        id: 'rec-weekly',
        nextDueDate: new Date('2024-03-01'),
        frequency: 'WEEKLY' as const,
        endDate: null,
      };

      mockRepo.getDueExpenses.mockResolvedValue([weeklyExpense]);
      mockTxClient.expense.create.mockResolvedValue({ id: 'exp-w' });
      mockTxClient.expenseSplit.createMany.mockResolvedValue({ count: 2 });
      mockTxClient.recurringExpense.update.mockResolvedValue({});

      await service.processDueExpenses();

      // Verify nextDueDate was advanced by 7 days
      expect(mockTxClient.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: 'rec-weekly' },
        data: {
          nextDueDate: new Date('2024-03-08'), // +7 days
          isActive: true,
        },
      });
    });

    it('should advance nextDueDate correctly for DAILY frequency', async () => {
      const dailyExpense = {
        ...baseRecurringExpense,
        id: 'rec-daily',
        nextDueDate: new Date('2024-03-01'),
        frequency: 'DAILY' as const,
        endDate: null,
      };

      mockRepo.getDueExpenses.mockResolvedValue([dailyExpense]);
      mockTxClient.expense.create.mockResolvedValue({ id: 'exp-d' });
      mockTxClient.expenseSplit.createMany.mockResolvedValue({ count: 2 });
      mockTxClient.recurringExpense.update.mockResolvedValue({});

      await service.processDueExpenses();

      expect(mockTxClient.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: 'rec-daily' },
        data: {
          nextDueDate: new Date('2024-03-02'), // +1 day
          isActive: true,
        },
      });
    });

    it('should advance nextDueDate correctly for MONTHLY frequency', async () => {
      const monthlyExpense = {
        ...baseRecurringExpense,
        id: 'rec-monthly',
        nextDueDate: new Date('2024-01-15'),
        frequency: 'MONTHLY' as const,
        endDate: null,
      };

      mockRepo.getDueExpenses.mockResolvedValue([monthlyExpense]);
      mockTxClient.expense.create.mockResolvedValue({ id: 'exp-m' });
      mockTxClient.expenseSplit.createMany.mockResolvedValue({ count: 2 });
      mockTxClient.recurringExpense.update.mockResolvedValue({});

      await service.processDueExpenses();

      expect(mockTxClient.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: 'rec-monthly' },
        data: {
          nextDueDate: new Date('2024-02-15'), // +1 month
          isActive: true,
        },
      });
    });

    it('should advance nextDueDate correctly for YEARLY frequency', async () => {
      const yearlyExpense = {
        ...baseRecurringExpense,
        id: 'rec-yearly',
        nextDueDate: new Date('2024-06-01'),
        frequency: 'YEARLY' as const,
        endDate: null,
      };

      mockRepo.getDueExpenses.mockResolvedValue([yearlyExpense]);
      mockTxClient.expense.create.mockResolvedValue({ id: 'exp-y' });
      mockTxClient.expenseSplit.createMany.mockResolvedValue({ count: 2 });
      mockTxClient.recurringExpense.update.mockResolvedValue({});

      await service.processDueExpenses();

      expect(mockTxClient.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: 'rec-yearly' },
        data: {
          nextDueDate: new Date('2025-06-01'), // +1 year
          isActive: true,
        },
      });
    });

    it('should deactivate recurring expense if next due date is past endDate', async () => {
      // Expense with endDate. After advancing, next due date will be past endDate.
      const expiringExpense = {
        ...baseRecurringExpense,
        id: 'rec-expiring',
        nextDueDate: new Date('2024-12-01'),
        frequency: 'MONTHLY' as const,
        endDate: new Date('2024-12-15'), // endDate is Dec 15
      };

      mockRepo.getDueExpenses.mockResolvedValue([expiringExpense]);
      mockTxClient.expense.create.mockResolvedValue({ id: 'exp-exp' });
      mockTxClient.expenseSplit.createMany.mockResolvedValue({ count: 2 });
      mockTxClient.recurringExpense.update.mockResolvedValue({});

      await service.processDueExpenses();

      // Next due date would be 2025-01-01 which is > 2024-12-15 (endDate)
      // So isActive should be set to false
      expect(mockTxClient.recurringExpense.update).toHaveBeenCalledWith({
        where: { id: 'rec-expiring' },
        data: {
          nextDueDate: new Date('2025-01-01'),
          isActive: false, // deactivated because past endDate
        },
      });
    });

    it('should count errors when processing fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const failingExpense = {
        ...baseRecurringExpense,
        id: 'rec-fail',
        nextDueDate: new Date('2024-01-01'),
        frequency: 'MONTHLY' as const,
        endDate: null,
      };

      mockRepo.getDueExpenses.mockResolvedValue([failingExpense]);

      // Make the transaction throw
      (mockPrisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error('DB error'));

      const result = await service.processDueExpenses();

      expect(result.created).toBe(0);
      expect(result.errors).toBe(1);

      consoleSpy.mockRestore();
    });

    it('should return zeros when no due expenses exist', async () => {
      mockRepo.getDueExpenses.mockResolvedValue([]);

      const result = await service.processDueExpenses();

      expect(result.created).toBe(0);
      expect(result.errors).toBe(0);
    });
  });
});
