import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ExpenseService } from '@/lib/services/expense.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const expenseService = new ExpenseService(prisma);

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const settled = searchParams.get('settled');
    
    let splits;
    if (settled === 'true') {
      splits = await expenseService.getUserSettledSplits(authResult.user!.userId);
    } else if (settled === 'false') {
      splits = await expenseService.getUserUnsettledSplits(authResult.user!.userId);
    } else {
      // Get all splits if no filter specified
      const [settledSplits, unsettledSplits] = await Promise.all([
        expenseService.getUserSettledSplits(authResult.user!.userId),
        expenseService.getUserUnsettledSplits(authResult.user!.userId)
      ]);
      splits = [...unsettledSplits, ...settledSplits];
    }
    
    return NextResponse.json({ splits });
  } catch (error) {
    console.error('Get user splits error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get user splits' },
      { status: 500 }
    );
  }
}