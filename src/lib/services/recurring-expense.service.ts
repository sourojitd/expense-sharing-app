import { PrismaClient, RecurringFrequency } from '@prisma/client';
import { RecurringExpenseRepository } from '../repositories/recurring-expense.repository';

interface ParticipantSplit {
  userId: string;
  amount: number;
}

interface ParticipantData {
  splits: ParticipantSplit[];
}

interface CreateRecurringExpenseData {
  description: string;
  amount: number;
  currency: string;
  groupId?: string;
  category?: string;
  splitType: string;
  frequency: RecurringFrequency;
  startDate: string | Date;
  endDate?: string | Date;
  participantData: ParticipantData;
}

interface UpdateRecurringExpenseData {
  description?: string;
  amount?: number;
  currency?: string;
  category?: string;
  splitType?: string;
  frequency?: RecurringFrequency;
  startDate?: string | Date;
  endDate?: string | Date | null;
  participantData?: ParticipantData;
}

function calculateNextDueDate(currentDate: Date, frequency: RecurringFrequency): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      break;
  }

  return next;
}

const VALID_FREQUENCIES: string[] = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'];

export class RecurringExpenseService {
  private repository: RecurringExpenseRepository;

  constructor(private prisma: PrismaClient) {
    this.repository = new RecurringExpenseRepository(prisma);
  }

  async create(data: CreateRecurringExpenseData, userId: string) {
    // Validate amount
    if (!data.amount || data.amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate frequency
    if (!VALID_FREQUENCIES.includes(data.frequency)) {
      throw new Error('Invalid frequency. Must be one of: ' + VALID_FREQUENCIES.join(', '));
    }

    // Validate start date
    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) {
      throw new Error('Invalid start date');
    }

    // Validate end date if provided
    let endDate: Date | undefined;
    if (data.endDate) {
      endDate = new Date(data.endDate);
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
      }
      if (endDate <= startDate) {
        throw new Error('End date must be after start date');
      }
    }

    // Validate participantData
    if (!data.participantData?.splits || data.participantData.splits.length === 0) {
      throw new Error('At least one participant is required');
    }

    return this.repository.create({
      description: data.description,
      amount: data.amount,
      currency: data.currency,
      paidBy: userId,
      groupId: data.groupId,
      category: data.category,
      splitType: data.splitType,
      frequency: data.frequency,
      startDate,
      endDate,
      nextDueDate: startDate,
      participantData: data.participantData,
    });
  }

  async update(id: string, userId: string, data: UpdateRecurringExpenseData) {
    // Verify ownership
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error('Recurring expense not found');
    }
    if (existing.paidBy !== userId) {
      throw new Error('Access denied: You can only update your own recurring expenses');
    }

    const updateData: Record<string, unknown> = {};

    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) {
      if (data.amount <= 0) throw new Error('Amount must be greater than 0');
      updateData.amount = data.amount;
    }
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.splitType !== undefined) updateData.splitType = data.splitType;
    if (data.frequency !== undefined) {
      if (!VALID_FREQUENCIES.includes(data.frequency)) {
        throw new Error('Invalid frequency');
      }
      updateData.frequency = data.frequency;
    }
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.participantData !== undefined) updateData.participantData = data.participantData;

    return this.repository.update(id, updateData);
  }

  async delete(id: string, userId: string) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error('Recurring expense not found');
    }
    if (existing.paidBy !== userId) {
      throw new Error('Access denied: You can only delete your own recurring expenses');
    }

    await this.repository.delete(id);
  }

  async pause(id: string, userId: string) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error('Recurring expense not found');
    }
    if (existing.paidBy !== userId) {
      throw new Error('Access denied: You can only pause your own recurring expenses');
    }

    return this.repository.update(id, { isActive: false });
  }

  async resume(id: string, userId: string) {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error('Recurring expense not found');
    }
    if (existing.paidBy !== userId) {
      throw new Error('Access denied: You can only resume your own recurring expenses');
    }

    // Recalculate nextDueDate: find the next occurrence from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextDueDate = new Date(existing.nextDueDate);

    // Advance nextDueDate until it's in the future (or today)
    while (nextDueDate < today) {
      nextDueDate = calculateNextDueDate(nextDueDate, existing.frequency);
    }

    // Check if endDate has passed
    if (existing.endDate && nextDueDate > existing.endDate) {
      throw new Error('Cannot resume: the end date has already passed');
    }

    return this.repository.update(id, {
      isActive: true,
      nextDueDate,
    });
  }

  async processDueExpenses() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueExpenses = await this.repository.getDueExpenses(today);
    const results: { created: number; errors: number } = { created: 0, errors: 0 };

    for (const recurring of dueExpenses) {
      try {
        const participantData = recurring.participantData as unknown as ParticipantData;
        const splits = participantData?.splits || [];

        await this.prisma.$transaction(async (tx) => {
          // Create the actual expense
          const expense = await tx.expense.create({
            data: {
              description: recurring.description,
              amount: recurring.amount,
              currency: recurring.currency,
              date: recurring.nextDueDate,
              paidBy: recurring.paidBy,
              groupId: recurring.groupId,
              category: recurring.category,
            },
          });

          // Create expense splits from participantData
          if (splits.length > 0) {
            await tx.expenseSplit.createMany({
              data: splits.map((split) => ({
                expenseId: expense.id,
                userId: split.userId,
                amount: split.amount,
                settled: false,
              })),
            });
          }

          // Calculate next due date
          const nextDueDate = calculateNextDueDate(
            new Date(recurring.nextDueDate),
            recurring.frequency
          );

          // Check if we should deactivate (end date reached)
          const shouldDeactivate =
            recurring.endDate && nextDueDate > recurring.endDate;

          await tx.recurringExpense.update({
            where: { id: recurring.id },
            data: {
              nextDueDate,
              isActive: !shouldDeactivate,
            },
          });
        });

        results.created++;
      } catch (error) {
        console.error(`Failed to process recurring expense ${recurring.id}:`, error);
        results.errors++;
      }
    }

    return results;
  }

  async getUserRecurringExpenses(
    userId: string,
    options?: { activeOnly?: boolean; groupId?: string }
  ) {
    return this.repository.getByUser(userId, options);
  }

  async getById(id: string, userId: string) {
    const recurring = await this.repository.getById(id);
    if (!recurring) {
      throw new Error('Recurring expense not found');
    }
    if (recurring.paidBy !== userId) {
      throw new Error('Access denied: You can only view your own recurring expenses');
    }
    return recurring;
  }
}
