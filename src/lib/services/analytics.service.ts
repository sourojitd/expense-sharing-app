import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GroupAnalytics {
  totalSpent: number;
  expenseCount: number;
  averageExpense: number;
  currency: string;
  spendingByCategory: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  spendingOverTime: Array<{ date: string; amount: number }>;
  memberSpending: Array<{
    userId: string;
    userName: string;
    totalPaid: number;
    totalOwed: number;
  }>;
  topExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
  }>;
}

export interface PersonalAnalytics {
  totalSpent: number;
  expenseCount: number;
  averageExpense: number;
  currency: string;
  spendingByCategory: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  spendingOverTime: Array<{ date: string; amount: number }>;
  monthlyTrend: Array<{ month: string; amount: number }>;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AnalyticsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get analytics data for a specific group.
   */
  async getGroupAnalytics(groupId: string, userId: string): Promise<GroupAnalytics> {
    // 1. Verify the user is a member of the group
    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: { groupId, userId },
      },
    });

    if (!membership) {
      throw new Error('Access denied: You are not a member of this group');
    }

    // 2. Fetch all group expenses with splits and payer info
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      include: {
        splits: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        payer: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // 3. Determine currency (use the most common currency in the group)
    const currency = this.getMostCommonCurrency(expenses) || 'USD';

    // 4. Calculate totals
    const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const expenseCount = expenses.length;
    const averageExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;

    // 5. Spending by category
    const spendingByCategory = this.calculateCategoryBreakdown(expenses);

    // 6. Spending over time (last 30 days, daily)
    const spendingOverTime = this.calculateSpendingOverTime(expenses, 30);

    // 7. Member spending breakdown
    const memberSpending = this.calculateMemberSpending(expenses);

    // 8. Top 5 expenses by amount
    const topExpenses = expenses
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)
      .map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        date: e.date.toISOString(),
        category: e.category || 'Other',
      }));

    return {
      totalSpent,
      expenseCount,
      averageExpense,
      currency,
      spendingByCategory,
      spendingOverTime,
      memberSpending,
      topExpenses,
    };
  }

  /**
   * Get personal analytics for the authenticated user.
   */
  async getPersonalAnalytics(userId: string): Promise<PersonalAnalytics> {
    // Fetch the user to get preferred currency
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredCurrency: true },
    });

    const currency = user?.preferredCurrency || 'USD';

    // Fetch all expenses where the user is payer or has a split
    const expenses = await this.prisma.expense.findMany({
      where: {
        OR: [
          { paidBy: userId },
          { splits: { some: { userId } } },
        ],
      },
      include: {
        splits: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        payer: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    // For personal analytics, use the user's split amount (what they owe)
    // If the user has a split, use that amount; otherwise skip
    const personalExpenses: Array<{
      id: string;
      amount: number;
      date: Date;
      category: string | null;
      description: string;
    }> = [];

    for (const expense of expenses) {
      const userSplit = expense.splits.find((s) => s.userId === userId);
      if (userSplit) {
        personalExpenses.push({
          id: expense.id,
          amount: Number(userSplit.amount),
          date: expense.date,
          category: expense.category,
          description: expense.description,
        });
      }
    }

    // Calculate totals
    const totalSpent = personalExpenses.reduce((sum, e) => sum + e.amount, 0);
    const expenseCount = personalExpenses.length;
    const averageExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;

    // Category breakdown
    const spendingByCategory = this.calculatePersonalCategoryBreakdown(personalExpenses);

    // Spending over time (last 30 days)
    const spendingOverTime = this.calculatePersonalSpendingOverTime(personalExpenses, 30);

    // Monthly trend (last 6 months)
    const monthlyTrend = this.calculateMonthlyTrend(personalExpenses, 6);

    return {
      totalSpent,
      expenseCount,
      averageExpense,
      currency,
      spendingByCategory,
      spendingOverTime,
      monthlyTrend,
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getMostCommonCurrency(
    expenses: Array<{ currency: string }>
  ): string | undefined {
    if (expenses.length === 0) return undefined;

    const counts: Record<string, number> = {};
    for (const e of expenses) {
      counts[e.currency] = (counts[e.currency] || 0) + 1;
    }

    let maxCurrency: string | undefined;
    let maxCount = 0;
    for (const [curr, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxCurrency = curr;
      }
    }
    return maxCurrency;
  }

  private calculateCategoryBreakdown(
    expenses: Array<{ amount: unknown; category: string | null }>
  ): GroupAnalytics['spendingByCategory'] {
    const categoryMap: Record<string, { amount: number; count: number }> = {};

    for (const expense of expenses) {
      const cat = expense.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { amount: 0, count: 0 };
      }
      categoryMap[cat].amount += Number(expense.amount);
      categoryMap[cat].count += 1;
    }

    const totalAmount = Object.values(categoryMap).reduce(
      (sum, v) => sum + v.amount,
      0
    );

    return Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private calculateSpendingOverTime(
    expenses: Array<{ amount: unknown; date: Date }>,
    days: number
  ): Array<{ date: string; amount: number }> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Initialize all days with zero
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = 0;
    }

    // Aggregate expenses by day
    for (const expense of expenses) {
      const dateKey = new Date(expense.date).toISOString().split('T')[0];
      if (dailyMap[dateKey] !== undefined) {
        dailyMap[dateKey] += Number(expense.amount);
      }
    }

    return Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  }

  private calculateMemberSpending(
    expenses: Array<{
      amount: unknown;
      paidBy: string;
      payer: { id: string; name: string };
      splits: Array<{
        userId: string;
        amount: unknown;
        user: { id: string; name: string };
      }>;
    }>
  ): GroupAnalytics['memberSpending'] {
    const memberMap: Record<
      string,
      { userName: string; totalPaid: number; totalOwed: number }
    > = {};

    for (const expense of expenses) {
      // Track what the payer paid
      const payerId = expense.payer.id;
      if (!memberMap[payerId]) {
        memberMap[payerId] = {
          userName: expense.payer.name,
          totalPaid: 0,
          totalOwed: 0,
        };
      }
      memberMap[payerId].totalPaid += Number(expense.amount);

      // Track what each member owes (from splits)
      for (const split of expense.splits) {
        const splitUserId = split.userId;
        if (!memberMap[splitUserId]) {
          memberMap[splitUserId] = {
            userName: split.user.name,
            totalPaid: 0,
            totalOwed: 0,
          };
        }
        memberMap[splitUserId].totalOwed += Number(split.amount);
      }
    }

    return Object.entries(memberMap)
      .map(([userId, data]) => ({
        userId,
        userName: data.userName,
        totalPaid: data.totalPaid,
        totalOwed: data.totalOwed,
      }))
      .sort((a, b) => b.totalPaid - a.totalPaid);
  }

  private calculatePersonalCategoryBreakdown(
    expenses: Array<{ amount: number; category: string | null }>
  ): PersonalAnalytics['spendingByCategory'] {
    const categoryMap: Record<string, { amount: number; count: number }> = {};

    for (const expense of expenses) {
      const cat = expense.category || 'Other';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { amount: 0, count: 0 };
      }
      categoryMap[cat].amount += expense.amount;
      categoryMap[cat].count += 1;
    }

    const totalAmount = Object.values(categoryMap).reduce(
      (sum, v) => sum + v.amount,
      0
    );

    return Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  private calculatePersonalSpendingOverTime(
    expenses: Array<{ amount: number; date: Date }>,
    days: number
  ): Array<{ date: string; amount: number }> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days + 1);
    startDate.setHours(0, 0, 0, 0);

    // Initialize all days with zero
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      dailyMap[key] = 0;
    }

    // Aggregate by day
    for (const expense of expenses) {
      const dateKey = new Date(expense.date).toISOString().split('T')[0];
      if (dailyMap[dateKey] !== undefined) {
        dailyMap[dateKey] += expense.amount;
      }
    }

    return Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date, amount }));
  }

  private calculateMonthlyTrend(
    expenses: Array<{ amount: number; date: Date }>,
    months: number
  ): Array<{ month: string; amount: number }> {
    const now = new Date();
    const monthlyMap: Record<string, number> = {};

    // Initialize last N months
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }

    // Aggregate by month
    for (const expense of expenses) {
      const d = new Date(expense.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key] !== undefined) {
        monthlyMap[key] += expense.amount;
      }
    }

    return Object.entries(monthlyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount }));
  }
}
