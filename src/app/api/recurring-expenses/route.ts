import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RecurringExpenseService } from '@/lib/services/recurring-expense.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const recurringExpenseService = new RecurringExpenseService(prisma);

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
    const { searchParams } = new URL(request.url);

    const options = {
      activeOnly: searchParams.get('activeOnly') === 'true' || undefined,
      groupId: searchParams.get('groupId') || undefined,
    };

    const recurringExpenses = await recurringExpenseService.getUserRecurringExpenses(userId, options);

    return NextResponse.json({ recurringExpenses });
  } catch (error) {
    console.error('Get recurring expenses error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get recurring expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.user!.userId;
    const body = await request.json();

    // Validate required fields
    if (!body.description || !body.amount || !body.currency || !body.splitType || !body.frequency || !body.startDate || !body.participantData) {
      return NextResponse.json(
        { error: 'Missing required fields: description, amount, currency, splitType, frequency, startDate, participantData' },
        { status: 400 }
      );
    }

    const recurringExpense = await recurringExpenseService.create(body, userId);

    return NextResponse.json(
      { message: 'Recurring expense created successfully', recurringExpense },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create recurring expense error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create recurring expense' },
      { status: 400 }
    );
  }
}
