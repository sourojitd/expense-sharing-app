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

    const balances = await balanceService.getUserBalances(authResult.user!.userId);

    return NextResponse.json({ balances });
  } catch (error) {
    console.error('Get balances error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get balances' },
      { status: 500 }
    );
  }
}
