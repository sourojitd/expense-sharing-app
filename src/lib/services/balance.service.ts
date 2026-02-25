import { PrismaClient } from '@prisma/client';

export interface UserBalance {
  userId: string;
  userName: string;
  amount: number; // positive = they owe you, negative = you owe them
  currency: string;
}

export interface BalanceSummary {
  totalOwed: number;   // total others owe you
  totalOwe: number;    // total you owe others
  netBalance: number;
  currency: string;
  balances: UserBalance[];
}

export interface SimplifiedDebt {
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
}

export class BalanceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get all balances for a user across all groups and non-group expenses
   */
  async getUserBalances(userId: string): Promise<BalanceSummary> {
    // Get all expenses where user is payer or has a split
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
        payer: { select: { id: true, name: true, preferredCurrency: true } },
      },
    });

    // Get all completed payments involving the user
    const payments = await this.prisma.payment.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
        status: 'COMPLETED',
      },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    // Calculate net balances per user pair
    const balanceMap = new Map<string, { amount: number; name: string }>();

    // Process expenses
    for (const expense of expenses) {
      if (expense.paidBy === userId) {
        // I paid - others owe me their split amounts
        for (const split of expense.splits) {
          if (split.userId !== userId) {
            const current = balanceMap.get(split.userId) || { amount: 0, name: split.user.name };
            current.amount += Number(split.amount);
            current.name = split.user.name;
            balanceMap.set(split.userId, current);
          }
        }
      } else {
        // Someone else paid - I owe them my split amount
        const mySplit = expense.splits.find(s => s.userId === userId);
        if (mySplit) {
          const current = balanceMap.get(expense.paidBy) || { amount: 0, name: expense.payer.name };
          current.amount -= Number(mySplit.amount);
          current.name = expense.payer.name;
          balanceMap.set(expense.paidBy, current);
        }
      }
    }

    // Process payments (completed ones reduce balances)
    for (const payment of payments) {
      const paymentAmount = Number(payment.amount);
      if (payment.fromUserId === userId) {
        // I paid someone - reduces what I owe them (or increases what they owe me)
        const current = balanceMap.get(payment.toUserId) || { amount: 0, name: payment.toUser.name };
        current.amount += paymentAmount;
        balanceMap.set(payment.toUserId, current);
      } else {
        // Someone paid me - reduces what they owe me (or increases what I owe them)
        const current = balanceMap.get(payment.fromUserId) || { amount: 0, name: payment.fromUser.name };
        current.amount -= paymentAmount;
        balanceMap.set(payment.fromUserId, current);
      }
    }

    // Get user's preferred currency
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredCurrency: true },
    });
    const currency = user?.preferredCurrency || 'USD';

    // Build balance list
    const balances: UserBalance[] = [];
    let totalOwed = 0;
    let totalOwe = 0;

    for (const [otherUserId, { amount, name }] of balanceMap.entries()) {
      if (Math.abs(amount) < 0.01) continue; // Skip zero balances

      balances.push({
        userId: otherUserId,
        userName: name,
        amount: Math.round(amount * 100) / 100,
        currency,
      });

      if (amount > 0) totalOwed += amount;
      else totalOwe += Math.abs(amount);
    }

    // Sort: largest amounts first
    balances.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    return {
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwe: Math.round(totalOwe * 100) / 100,
      netBalance: Math.round((totalOwed - totalOwe) * 100) / 100,
      currency,
      balances,
    };
  }

  /**
   * Get balances within a specific group
   */
  async getGroupBalances(groupId: string, userId: string): Promise<BalanceSummary> {
    // Verify user is member of the group
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new Error('Access denied. You are not a member of this group.');

    // Get group expenses
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      include: {
        splits: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        payer: { select: { id: true, name: true, preferredCurrency: true } },
      },
    });

    // Get group payments
    const payments = await this.prisma.payment.findMany({
      where: { groupId, status: 'COMPLETED' },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
    });

    // Calculate net balances from this user's perspective
    const balanceMap = new Map<string, { amount: number; name: string }>();

    for (const expense of expenses) {
      if (expense.paidBy === userId) {
        for (const split of expense.splits) {
          if (split.userId !== userId) {
            const current = balanceMap.get(split.userId) || { amount: 0, name: split.user.name };
            current.amount += Number(split.amount);
            current.name = split.user.name;
            balanceMap.set(split.userId, current);
          }
        }
      } else {
        const mySplit = expense.splits.find(s => s.userId === userId);
        if (mySplit) {
          const current = balanceMap.get(expense.paidBy) || { amount: 0, name: expense.payer.name };
          current.amount -= Number(mySplit.amount);
          current.name = expense.payer.name;
          balanceMap.set(expense.paidBy, current);
        }
      }
    }

    for (const payment of payments) {
      const paymentAmount = Number(payment.amount);
      if (payment.fromUserId === userId) {
        const current = balanceMap.get(payment.toUserId) || { amount: 0, name: payment.toUser.name };
        current.amount += paymentAmount;
        balanceMap.set(payment.toUserId, current);
      } else if (payment.toUserId === userId) {
        const current = balanceMap.get(payment.fromUserId) || { amount: 0, name: payment.fromUser.name };
        current.amount -= paymentAmount;
        balanceMap.set(payment.fromUserId, current);
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredCurrency: true },
    });
    const currency = user?.preferredCurrency || 'USD';

    const balances: UserBalance[] = [];
    let totalOwed = 0;
    let totalOwe = 0;

    for (const [otherUserId, { amount, name }] of balanceMap.entries()) {
      if (Math.abs(amount) < 0.01) continue;
      balances.push({ userId: otherUserId, userName: name, amount: Math.round(amount * 100) / 100, currency });
      if (amount > 0) totalOwed += amount;
      else totalOwe += Math.abs(amount);
    }

    balances.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

    return {
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwe: Math.round(totalOwe * 100) / 100,
      netBalance: Math.round((totalOwed - totalOwe) * 100) / 100,
      currency,
      balances,
    };
  }

  /**
   * Simplify debts within a group using greedy algorithm.
   * Minimizes number of transactions needed to settle all debts.
   */
  async simplifyDebts(groupId: string, userId: string): Promise<SimplifiedDebt[]> {
    // Verify membership
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new Error('Access denied. You are not a member of this group.');

    // Get all group members
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, preferredCurrency: true } } },
    });

    // Get all group expenses
    const expenses = await this.prisma.expense.findMany({
      where: { groupId },
      include: { splits: true },
    });

    // Get completed group payments
    const payments = await this.prisma.payment.findMany({
      where: { groupId, status: 'COMPLETED' },
    });

    // Calculate net balance for each member
    // Positive = person is owed money (creditor), Negative = person owes money (debtor)
    const netBalances = new Map<string, number>();
    const userNames = new Map<string, string>();

    for (const member of members) {
      netBalances.set(member.userId, 0);
      userNames.set(member.userId, member.user.name);
    }

    // Process expenses: payer gets +amount, each split participant gets -splitAmount
    for (const expense of expenses) {
      netBalances.set(expense.paidBy, (netBalances.get(expense.paidBy) || 0) + Number(expense.amount));
      for (const split of expense.splits) {
        netBalances.set(split.userId, (netBalances.get(split.userId) || 0) - Number(split.amount));
      }
    }

    // Process payments: sender gets -amount, receiver gets +amount
    for (const payment of payments) {
      const amount = Number(payment.amount);
      netBalances.set(payment.fromUserId, (netBalances.get(payment.fromUserId) || 0) - amount);
      netBalances.set(payment.toUserId, (netBalances.get(payment.toUserId) || 0) + amount);
    }

    // Separate into creditors and debtors
    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];

    for (const [uid, balance] of netBalances.entries()) {
      const rounded = Math.round(balance * 100) / 100;
      if (rounded > 0.01) creditors.push({ userId: uid, amount: rounded });
      else if (rounded < -0.01) debtors.push({ userId: uid, amount: Math.abs(rounded) });
    }

    // Sort both lists by amount (largest first) for optimal matching
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // Greedy matching: match largest debtor with largest creditor
    const simplifiedDebts: SimplifiedDebt[] = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const settleAmount = Math.min(debtor.amount, creditor.amount);

      if (settleAmount > 0.01) {
        simplifiedDebts.push({
          fromUserId: debtor.userId,
          fromUserName: userNames.get(debtor.userId) || 'Unknown',
          toUserId: creditor.userId,
          toUserName: userNames.get(creditor.userId) || 'Unknown',
          amount: Math.round(settleAmount * 100) / 100,
          currency: members[0]?.user.preferredCurrency || 'USD',
        });
      }

      debtor.amount -= settleAmount;
      creditor.amount -= settleAmount;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }

    return simplifiedDebts;
  }
}
