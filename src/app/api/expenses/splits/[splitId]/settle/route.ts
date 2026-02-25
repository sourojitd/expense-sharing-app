import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ExpenseService } from '@/lib/services/expense.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const expenseService = new ExpenseService(prisma);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ splitId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { splitId } = await params;
    const split = await expenseService.settleExpenseSplit(splitId, authResult.user!.userId);

    return NextResponse.json({
      message: 'Expense split settled successfully',
      split
    });
  } catch (error) {
    console.error('Settle expense split error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to settle expense split' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ splitId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { splitId } = await params;
    const split = await expenseService.unsettleExpenseSplit(splitId, authResult.user!.userId);

    return NextResponse.json({
      message: 'Expense split unsettled successfully',
      split
    });
  } catch (error) {
    console.error('Unsettle expense split error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to unsettle expense split' },
      { status: 400 }
    );
  }
}
