import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BalanceService } from '@/lib/services/balance.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const balanceService = new BalanceService(prisma);

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.user!.userId;

    // Fetch all dashboard data in parallel
    const [balanceSummary, recentExpenses, user] = await Promise.all([
      balanceService.getUserBalances(userId),
      prisma.expense.findMany({
        where: {
          OR: [
            { paidBy: userId },
            { splits: { some: { userId } } },
          ],
        },
        include: {
          payer: { select: { id: true, name: true } },
          group: { select: { id: true, name: true } },
          splits: {
            include: {
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { date: 'desc' },
        take: 5,
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          preferredCurrency: true,
        },
      }),
    ]);

    // Fetch recent groups through memberships
    const recentGroups = await prisma.group.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { members: true, expenses: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      user,
      balanceSummary,
      recentExpenses,
      recentGroups,
    });
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get dashboard summary' },
      { status: 500 }
    );
  }
}
