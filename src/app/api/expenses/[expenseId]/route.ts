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
    const expense = await expenseService.getExpenseById(expenseId, authResult.user!.userId);

    if (!expense) {
      return NextResponse.json(
        { error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Get expense error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get expense' },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const body = await request.json();

    // Convert date string to Date object if provided
    const updateData = {
      ...body,
      ...(body.date && { date: new Date(body.date) }),
    };

    const expense = await expenseService.updateExpense(
      expenseId,
      updateData,
      authResult.user!.userId
    );

    return NextResponse.json({
      message: 'Expense updated successfully',
      expense
    });
  } catch (error) {
    console.error('Update expense error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update expense' },
      { status: 400 }
    );
  }
}

export async function DELETE(
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
    await expenseService.deleteExpense(expenseId, authResult.user!.userId);

    return NextResponse.json({
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete expense' },
      { status: 400 }
    );
  }
}
