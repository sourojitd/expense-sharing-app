import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RecurringExpenseService } from '@/lib/services/recurring-expense.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const recurringExpenseService = new RecurringExpenseService(prisma);

export async function GET(
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

    const recurringExpense = await recurringExpenseService.getById(recurringId, userId);

    return NextResponse.json({ recurringExpense });
  } catch (error) {
    console.error('Get recurring expense error:', error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get recurring expense' },
      { status }
    );
  }
}

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
    const body = await request.json();

    const recurringExpense = await recurringExpenseService.update(recurringId, userId, body);

    return NextResponse.json({
      message: 'Recurring expense updated successfully',
      recurringExpense,
    });
  } catch (error) {
    console.error('Update recurring expense error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update recurring expense' },
      { status: 400 }
    );
  }
}

export async function DELETE(
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

    await recurringExpenseService.delete(recurringId, userId);

    return NextResponse.json({
      message: 'Recurring expense deleted successfully',
    });
  } catch (error) {
    console.error('Delete recurring expense error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete recurring expense' },
      { status: 400 }
    );
  }
}
