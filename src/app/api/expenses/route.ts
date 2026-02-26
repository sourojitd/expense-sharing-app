import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ExpenseService } from '@/lib/services/expense.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';
import { ExpenseFilters, ExpenseCategory } from '@/lib/models/expense';

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
    
    // Parse query parameters
    const filters: ExpenseFilters = {
      groupId: searchParams.get('groupId') || undefined,
      userId: searchParams.get('userId') || undefined,
      category: searchParams.get('category') as ExpenseCategory || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      settled: searchParams.get('settled') ? searchParams.get('settled') === 'true' : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
      search: searchParams.get('search') || undefined,
      amountMin: searchParams.get('amountMin') ? parseFloat(searchParams.get('amountMin')!) : undefined,
      amountMax: searchParams.get('amountMax') ? parseFloat(searchParams.get('amountMax')!) : undefined,
      paidByUserId: searchParams.get('paidByUserId') || undefined,
    };

    const userId = authResult.user!.userId;
    const [expenses, totalCount] = await Promise.all([
      expenseService.getExpenses(filters, userId),
      expenseService.countExpenses(filters, userId),
    ]);

    return NextResponse.json({ expenses, totalCount });
  } catch (error) {
    console.error('Get expenses error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get expenses' },
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

    const body = await request.json();
    
    // Validate required fields
    if (!body.description || !body.amount || !body.currency || !body.date || !body.paidBy || !body.splitType || !body.participants) {
      return NextResponse.json(
        { error: 'Missing required fields: description, amount, currency, date, paidBy, splitType, participants' },
        { status: 400 }
      );
    }

    // Convert date string to Date object
    const expenseData = {
      ...body,
      date: new Date(body.date),
    };

    const expense = await expenseService.createExpense(expenseData, authResult.user!.userId);

    return NextResponse.json({
      message: 'Expense created successfully',
      expense
    }, { status: 201 });
  } catch (error) {
    console.error('Create expense error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create expense' },
      { status: 400 }
    );
  }
}