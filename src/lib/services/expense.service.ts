import { PrismaClient } from '@prisma/client';
import { 
  Expense, 
  ExpenseSplit,
  ExpenseWithSplits,
  ExpenseFilters,
  ExpenseSummary,
  ExpenseCreateData,
  ExpenseUpdateData,
  SplitType,
  ExpenseCategory
} from '../models/expense';
import { ExpenseRepository } from '../repositories/expense.repository';
import { GroupRepository } from '../repositories/group.repository';

export interface CreateExpenseWithSplitsData extends Omit<ExpenseCreateData, 'splits'> {
  splitType: SplitType;
  participants: Array<{
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }>;
}

export interface UpdateExpenseWithSplitsData extends ExpenseUpdateData {
  splitType?: SplitType;
  participants?: Array<{
    userId: string;
    amount?: number;
    percentage?: number;
    shares?: number;
  }>;
}

export class ExpenseService {
  private expenseRepository: ExpenseRepository;
  private groupRepository: GroupRepository;

  constructor(private prisma: PrismaClient) {
    this.expenseRepository = new ExpenseRepository(prisma);
    this.groupRepository = new GroupRepository(prisma);
  }

  /**
   * Create a new expense with splits
   */
  async createExpense(data: CreateExpenseWithSplitsData, createdBy: string): Promise<ExpenseWithSplits> {
    // Validate the expense data
    Expense.validate({
      ...data,
      splits: data.participants.map(p => ({ userId: p.userId }))
    });

    // Validate user permissions
    await this.validateUserPermissions(data.groupId, createdBy);

    // Validate participants
    await this.validateParticipants(data.groupId, data.participants.map(p => p.userId));

    // Calculate split amounts
    const calculatedSplits = Expense.calculateSplitAmounts(
      data.amount,
      data.splitType,
      data.participants
    );

    // Start transaction
    return await this.prisma.$transaction(async (tx) => {
      // Create expense
      const expense = await tx.expense.create({
        data: {
          description: data.description,
          amount: data.amount,
          currency: data.currency,
          date: data.date,
          paidBy: data.paidBy,
          groupId: data.groupId,
          category: data.category || ExpenseCategory.OTHER,
          receipt: data.receipt,
          notes: data.notes,
        },
      });

      // Create splits
      const splitData = calculatedSplits.map(split => ({
        expenseId: expense.id,
        userId: split.userId,
        amount: split.amount,
        percentage: split.percentage || null,
        shares: split.shares || null,
        settled: false,
      }));

      await tx.expenseSplit.createMany({
        data: splitData,
      });

      // Fetch and return the complete expense with splits
      const expenseWithSplits = await tx.expense.findUnique({
        where: { id: expense.id },
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

      if (!expenseWithSplits) {
        throw new Error('Failed to create expense');
      }

      return expenseWithSplits;
    });
  }

  /**
   * Get expense by ID
   */
  async getExpenseById(id: string, userId: string): Promise<ExpenseWithSplits | null> {
    // Check if user can access this expense
    const canAccess = await this.expenseRepository.checkUserCanAccessExpense(id, userId);
    if (!canAccess) {
      throw new Error('Access denied: You do not have permission to view this expense');
    }

    return await this.expenseRepository.getExpenseWithSplits(id);
  }

  /**
   * Update an expense
   */
  async updateExpense(
    id: string, 
    data: UpdateExpenseWithSplitsData, 
    userId: string
  ): Promise<ExpenseWithSplits> {
    // Check if expense exists and user can access it
    const existingExpense = await this.expenseRepository.getExpenseWithSplits(id);
    if (!existingExpense) {
      throw new Error('Expense not found');
    }

    const canAccess = await this.expenseRepository.checkUserCanAccessExpense(id, userId);
    if (!canAccess) {
      throw new Error('Access denied: You do not have permission to update this expense');
    }

    // Validate the update data
    const validatedData = Expense.validateUpdate(data);

    return await this.prisma.$transaction(async (tx) => {
      // Update expense
      const updatedExpense = await tx.expense.update({
        where: { id },
        data: {
          ...(validatedData.description && { description: validatedData.description }),
          ...(validatedData.amount !== undefined && { amount: validatedData.amount }),
          ...(validatedData.currency && { currency: validatedData.currency }),
          ...(validatedData.date && { date: validatedData.date }),
          ...(validatedData.paidBy && { paidBy: validatedData.paidBy }),
          ...(validatedData.groupId !== undefined && { groupId: validatedData.groupId }),
          ...(validatedData.category !== undefined && { category: validatedData.category }),
          ...(validatedData.receipt !== undefined && { receipt: validatedData.receipt }),
          ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
        },
      });

      // If splits are being updated
      if (data.splitType && data.participants) {
        // Validate participants
        await this.validateParticipants(updatedExpense.groupId, data.participants.map(p => p.userId));

        // Calculate new split amounts
        const calculatedSplits = Expense.calculateSplitAmounts(
          validatedData.amount || existingExpense.amount.toNumber(),
          data.splitType,
          data.participants
        );

        // Delete existing splits
        await tx.expenseSplit.deleteMany({
          where: { expenseId: id },
        });

        // Create new splits
        const splitData = calculatedSplits.map(split => ({
          expenseId: id,
          userId: split.userId,
          amount: split.amount,
          percentage: split.percentage || null,
          shares: split.shares || null,
          settled: false,
        }));

        await tx.expenseSplit.createMany({
          data: splitData,
        });
      }

      // Fetch and return the updated expense with splits
      const expenseWithSplits = await tx.expense.findUnique({
        where: { id },
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

      if (!expenseWithSplits) {
        throw new Error('Failed to update expense');
      }

      return expenseWithSplits;
    });
  }

  /**
   * Delete an expense
   */
  async deleteExpense(id: string, userId: string): Promise<void> {
    // Check if expense exists and user can access it
    const expense = await this.expenseRepository.getExpenseWithSplits(id);
    if (!expense) {
      throw new Error('Expense not found');
    }

    const canAccess = await this.expenseRepository.checkUserCanAccessExpense(id, userId);
    if (!canAccess) {
      throw new Error('Access denied: You do not have permission to delete this expense');
    }

    // Check if user is the payer or group admin
    const isPayerOrAdmin = expense.paidBy === userId || 
      (expense.groupId && await this.isGroupAdmin(expense.groupId, userId));

    if (!isPayerOrAdmin) {
      throw new Error('Access denied: Only the payer or group admin can delete this expense');
    }

    await this.expenseRepository.deleteExpense(id);
  }

  /**
   * Get expenses with filters
   */
  async getExpenses(filters: ExpenseFilters, userId: string): Promise<ExpenseWithSplits[]> {
    // If groupId is specified, validate user access to the group
    if (filters.groupId) {
      const isMember = await this.groupRepository.isUserMember(filters.groupId, userId);
      if (!isMember) {
        throw new Error('Access denied: You are not a member of this group');
      }
    }

    // If no specific user filter, default to current user's expenses
    const effectiveFilters = {
      ...filters,
      userId: filters.userId || userId,
    };

    return await this.expenseRepository.getExpenses(effectiveFilters);
  }

  /**
   * Get user's expenses
   */
  async getUserExpenses(userId: string, filters: Omit<ExpenseFilters, 'userId'> = {}): Promise<ExpenseWithSplits[]> {
    return await this.expenseRepository.getUserExpenses(userId, filters);
  }

  /**
   * Get group expenses
   */
  async getGroupExpenses(groupId: string, userId: string, filters: Omit<ExpenseFilters, 'groupId'> = {}): Promise<ExpenseWithSplits[]> {
    // Validate user access to the group
    const isMember = await this.groupRepository.isUserMember(groupId, userId);
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this group');
    }

    return await this.expenseRepository.getGroupExpenses(groupId, filters);
  }

  /**
   * Calculate split amounts for different split types
   */
  calculateSplitAmounts(
    totalAmount: number,
    splitType: SplitType,
    participants: Array<{
      userId: string;
      amount?: number;
      percentage?: number;
      shares?: number;
    }>
  ): Array<{ userId: string; amount: number; percentage?: number; shares?: number }> {
    return Expense.calculateSplitAmounts(totalAmount, splitType, participants);
  }

  /**
   * Settle an expense split
   */
  async settleExpenseSplit(splitId: string, userId: string): Promise<ExpenseSplit> {
    // Get the split to validate access
    const split = await this.prisma.expenseSplit.findUnique({
      where: { id: splitId },
      include: {
        expense: true,
      },
    });

    if (!split) {
      throw new Error('Expense split not found');
    }

    // Check if user can settle this split (must be the user who owes or the payer)
    if (split.userId !== userId && split.expense.paidBy !== userId) {
      throw new Error('Access denied: You can only settle your own splits or splits owed to you');
    }

    return await this.expenseRepository.settleExpenseSplit(splitId);
  }

  /**
   * Unsettle an expense split
   */
  async unsettleExpenseSplit(splitId: string, userId: string): Promise<ExpenseSplit> {
    // Get the split to validate access
    const split = await this.prisma.expenseSplit.findUnique({
      where: { id: splitId },
      include: {
        expense: true,
      },
    });

    if (!split) {
      throw new Error('Expense split not found');
    }

    // Check if user can unsettle this split (must be the user who owes or the payer)
    if (split.userId !== userId && split.expense.paidBy !== userId) {
      throw new Error('Access denied: You can only unsettle your own splits or splits owed to you');
    }

    return await this.expenseRepository.unsettleExpenseSplit(splitId);
  }

  /**
   * Get expense summary/analytics
   */
  async getExpenseSummary(filters: ExpenseFilters, userId: string): Promise<ExpenseSummary> {
    // If groupId is specified, validate user access to the group
    if (filters.groupId) {
      const isMember = await this.groupRepository.isUserMember(filters.groupId, userId);
      if (!isMember) {
        throw new Error('Access denied: You are not a member of this group');
      }
    }

    // If no specific user filter, default to current user's expenses
    const effectiveFilters = {
      ...filters,
      userId: filters.userId || userId,
    };

    return await this.expenseRepository.getExpenseSummary(effectiveFilters);
  }

  /**
   * Count expenses matching filters
   */
  async countExpenses(filters: ExpenseFilters, userId: string): Promise<number> {
    if (filters.groupId) {
      const isMember = await this.groupRepository.isUserMember(filters.groupId, userId);
      if (!isMember) {
        throw new Error('Access denied: You are not a member of this group');
      }
    }

    const effectiveFilters = {
      ...filters,
      userId: filters.userId || userId,
    };

    return await this.expenseRepository.countExpenses(effectiveFilters);
  }

  /**
   * Get user's unsettled splits
   */
  async getUserUnsettledSplits(userId: string): Promise<ExpenseSplit[]> {
    return await this.expenseRepository.getUserSplits(userId, false);
  }

  /**
   * Get user's settled splits
   */
  async getUserSettledSplits(userId: string): Promise<ExpenseSplit[]> {
    return await this.expenseRepository.getUserSplits(userId, true);
  }

  // Private helper methods

  /**
   * Validate user permissions for expense operations
   */
  private async validateUserPermissions(groupId: string | undefined, userId: string): Promise<void> {
    if (groupId) {
      const isMember = await this.groupRepository.isUserMember(groupId, userId);
      if (!isMember) {
        throw new Error('Access denied: You are not a member of this group');
      }
    }
  }

  /**
   * Validate that all participants are valid users and group members (if applicable)
   */
  private async validateParticipants(groupId: string | undefined, participantIds: string[]): Promise<void> {
    if (participantIds.length === 0) {
      throw new Error('At least one participant is required');
    }

    // Check if all participants are valid users
    const users = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: { id: true },
    });

    if (users.length !== participantIds.length) {
      throw new Error('One or more participants are invalid users');
    }

    // If it's a group expense, validate that all participants are group members
    if (groupId) {
      for (const participantId of participantIds) {
        const isMember = await this.groupRepository.isUserMember(groupId, participantId);
        if (!isMember) {
          throw new Error(`User ${participantId} is not a member of the group`);
        }
      }
    }
  }

  /**
   * Check if user is a group admin
   */
  private async isGroupAdmin(groupId: string, userId: string): Promise<boolean> {
    // Check if user is the group creator
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        createdBy: userId,
      },
    });

    if (group) return true;

    // Check if user is a group admin
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return member?.role === 'admin';
  }
}