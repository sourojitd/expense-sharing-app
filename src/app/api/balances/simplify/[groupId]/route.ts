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
    const simplifiedDebts = await balanceService.simplifyDebts(groupId, authResult.user!.userId);

    return NextResponse.json({ simplifiedDebts });
  } catch (error) {
    console.error('Simplify debts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to simplify debts' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 500 }
    );
  }
}
