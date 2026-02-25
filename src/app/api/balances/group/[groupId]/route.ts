import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BalanceService } from '@/lib/services/balance.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const balanceService = new BalanceService(prisma);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { groupId } = await params;
    const balances = await balanceService.getGroupBalances(groupId, authResult.user!.userId);

    return NextResponse.json({ balances });
  } catch (error) {
    console.error('Get group balances error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get group balances' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 500 }
    );
  }
}
