import { PrismaClient } from '@prisma/client';
import { 
  Expense, 
  ExpenseSplit,
  ExpenseWithSplits,
  ExpenseFilters,
  ExpenseSummary,
  ExpenseCreateData,
  ExpenseUpdateData,
  ExpenseSplitCreateData,
  ExpenseSplitUpdateData
} from '../models/expense';

export class ExpenseRepository {
  constructor(private prisma: PrismaClient) {}

  async createExpense(data: ExpenseCreateData): Promise<Expense> {
    const expense = await this.prisma.expense.create({
      data: {
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        paidBy: data.paidBy,
        groupId: data.groupId,
        category: data.category,
        receipt: data.receipt,
        notes: data.notes,
      },
    });

    return expense;
  }

  async getExpenseById(id: string): Promise<Expense | null> {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
    });

    return expense;
  }

  async getExpenseWithSplits(id: string): Promise<ExpenseWithSplits | null> {
    const expense = await this.prisma.expense.findUnique({
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

    return expense;
  }

  async updateExpense(id: string, data: ExpenseUpdateData): Promise<Expense> {
    const expense = await this.prisma.expense.update({
      where: { id },
      data: {
        ...(data.description && { description: data.description }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.currency && { currency: data.currency }),
        ...(data.date && { date: data.date }),
        ...(data.paidBy && { paidBy: data.paidBy }),
        ...(data.groupId !== undefined && { groupId: data.groupId }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.receipt !== undefined && { receipt: data.receipt }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    });

    return expense;
  }

  async deleteExpense(id: string): Promise<void> {
    await this.prisma.expense.delete({
      where: { id },
    });
  }

  private buildWhereClause(filters: ExpenseFilters = {}): any {
    const {
      groupId,
      userId,
      category,
      dateFrom,
      dateTo,
      settled,
      search,
      amountMin,
      amountMax,
      paidByUserId,
    } = filters;

    const where: any = {};

    if (groupId) {
      where.groupId = groupId;
    }

    if (userId) {
      where.OR = [
        { paidBy: userId },
        { splits: { some: { userId } } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = dateFrom;
      if (dateTo) where.date.lte = dateTo;
    }

    if (settled !== undefined) {
      where.splits = {
        some: {
          settled,
        },
      };
    }

    if (search) {
      where.description = { contains: search, mode: 'insensitive' };
    }

    if (amountMin !== undefined || amountMax !== undefined) {
      where.amount = {};
      if (amountMin !== undefined) where.amount.gte = amountMin;
      if (amountMax !== undefined) where.amount.lte = amountMax;
    }

    if (paidByUserId) {
      where.paidBy = paidByUserId;
    }

    return where;
  }

  async getExpenses(filters: ExpenseFilters = {}): Promise<ExpenseWithSplits[]> {
    const { limit = 50, offset = 0 } = filters;
    const where = this.buildWhereClause(filters);

    const expenses = await this.prisma.expense.findMany({
      where,
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
      orderBy: { date: 'desc' },
      take: limit,
      skip: offset,
    });

    return expenses;
  }

  async countExpenses(filters: ExpenseFilters = {}): Promise<number> {
    const where = this.buildWhereClause(filters);
    return await this.prisma.expense.count({ where });
  }

  async getUserExpenses(userId: string, filters: Omit<ExpenseFilters, 'userId'> = {}): Promise<ExpenseWithSplits[]> {
    return this.getExpenses({ ...filters, userId });
  }

  async getGroupExpenses(groupId: string, filters: Omit<ExpenseFilters, 'groupId'> = {}): Promise<ExpenseWithSplits[]> {
    return this.getExpenses({ ...filters, groupId });
  }

  // Expense Split operations
  async createExpenseSplit(data: ExpenseSplitCreateData): Promise<ExpenseSplit> {
    const split = await this.prisma.expenseSplit.create({
      data: {
        expenseId: data.expenseId,
        userId: data.userId,
        amount: data.amount,
        percentage: data.percentage,
        shares: data.shares,
        settled: data.settled,
      },
    });

    return split;
  }

  async createExpenseSplits(splits: ExpenseSplitCreateData[]): Promise<ExpenseSplit[]> {
    await this.prisma.expenseSplit.createMany({
      data: splits,
    });

    // Fetch the created splits to return them
    const expenseIds = [...new Set(splits.map(s => s.expenseId))];
    const result = await this.prisma.expenseSplit.findMany({
      where: {
        expenseId: { in: expenseIds },
      },
    });

    return result;
  }

  async updateExpenseSplit(id: string, data: ExpenseSplitUpdateData): Promise<ExpenseSplit> {
    const split = await this.prisma.expenseSplit.update({
      where: { id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.percentage !== undefined && { percentage: data.percentage }),
        ...(data.shares !== undefined && { shares: data.shares }),
        ...(data.settled !== undefined && { settled: data.settled }),
      },
    });

    return split;
  }

  async deleteExpenseSplit(id: string): Promise<void> {
    await this.prisma.expenseSplit.delete({
      where: { id },
    });
  }

  async deleteExpenseSplits(expenseId: string): Promise<void> {
    await this.prisma.expenseSplit.deleteMany({
      where: { expenseId },
    });
  }

  async getExpenseSplits(expenseId: string): Promise<ExpenseSplit[]> {
    const splits = await this.prisma.expenseSplit.findMany({
      where: { expenseId },
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
    });

    return splits;
  }

  async getUserSplits(userId: string, settled?: boolean): Promise<ExpenseSplit[]> {
    const where: any = { userId };
    if (settled !== undefined) {
      where.settled = settled;
    }

    const splits = await this.prisma.expenseSplit.findMany({
      where,
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

    return splits;
  }

  async settleExpenseSplit(id: string): Promise<ExpenseSplit> {
    const split = await this.prisma.expenseSplit.update({
      where: { id },
      data: { settled: true },
    });

    return split;
  }

  async unsettleExpenseSplit(id: string): Promise<ExpenseSplit> {
    const split = await this.prisma.expenseSplit.update({
      where: { id },
      data: { settled: false },
    });

    return split;
  }

  // Analytics and summary operations
  async getExpenseSummary(filters: ExpenseFilters = {}): Promise<ExpenseSummary> {
    const { groupId, userId, dateFrom, dateTo } = filters;

    const where: any = {};

    if (groupId) {
      where.groupId = groupId;
    }

    if (userId) {
      where.OR = [
        { paidBy: userId },
        { splits: { some: { userId } } },
      ];
    }

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date.gte = dateFrom;
      if (dateTo) where.date.lte = dateTo;
    }

    // Get total expenses and amount
    const totalStats = await this.prisma.expense.aggregate({
      where,
      _count: { id: true },
      _sum: { amount: true },
    });

    // Get category breakdown
    const categoryStats = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
    });

    // Get monthly trend (last 12 months)
    const monthlyStats = await this.prisma.expense.groupBy({
      by: ['date'],
      where: {
        ...where,
        date: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 12)),
        },
      },
      _sum: { amount: true },
    });

    // Process monthly trend data
    const monthlyTrend = monthlyStats.reduce((acc, stat) => {
      const month = stat.date.toISOString().substring(0, 7); // YYYY-MM format
      const existing = acc.find(item => item.month === month);
      
      if (existing) {
        existing.amount += stat._sum.amount?.toNumber() || 0;
      } else {
        acc.push({
          month,
          amount: stat._sum.amount?.toNumber() || 0,
        });
      }
      
      return acc;
    }, [] as Array<{ month: string; amount: number }>);

    return {
      totalExpenses: totalStats._count.id,
      totalAmount: totalStats._sum.amount?.toNumber() || 0,
      currency: 'USD', // TODO: Handle multiple currencies
      categoryBreakdown: categoryStats.reduce((acc, stat) => {
        acc[stat.category || 'other'] = stat._sum.amount?.toNumber() || 0;
        return acc;
      }, {} as Record<string, number>),
      monthlyTrend: monthlyTrend.sort((a, b) => a.month.localeCompare(b.month)),
    };
  }

  async getExpensesByIds(expenseIds: string[]): Promise<Expense[]> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        id: { in: expenseIds },
      },
    });

    return expenses;
  }

  async checkExpenseExists(id: string): Promise<boolean> {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      select: { id: true },
    });

    return !!expense;
  }

  async checkUserCanAccessExpense(expenseId: string, userId: string): Promise<boolean> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        OR: [
          { paidBy: userId },
          { splits: { some: { userId } } },
          {
            group: {
              OR: [
                { createdBy: userId },
                { members: { some: { userId } } },
              ],
            },
          },
        ],
      },
    });

    return !!expense;
  }
}