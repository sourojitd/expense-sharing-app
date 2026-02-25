import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ExpenseService } from '@/lib/services/expense.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const expenseService = new ExpenseService(prisma);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { expenseId } = await params;

    // Get expense with splits to verify access
    const expense = await expenseService.getExpenseById(expenseId, authResult.user!.userId);

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ splits: expense.splits });
  } catch (error) {
    console.error('Get expense splits error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get expense splits' },
      { status: 500 }
    );
  }
}
