import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RecurringExpenseService } from '@/lib/services/recurring-expense.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const recurringExpenseService = new RecurringExpenseService(prisma);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ recurringId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { recurringId } = await params;
    const userId = authResult.user!.userId;

    const recurringExpense = await recurringExpenseService.pause(recurringId, userId);

    return NextResponse.json({
      message: 'Recurring expense paused successfully',
      recurringExpense,
    });
  } catch (error) {
    console.error('Pause recurring expense error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pause recurring expense' },
      { status: 400 }
    );
  }
}
