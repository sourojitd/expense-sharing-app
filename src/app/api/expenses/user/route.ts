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
    const filters: Omit<ExpenseFilters, 'userId'> = {
      groupId: searchParams.get('groupId') || undefined,
      category: searchParams.get('category') as ExpenseCategory || undefined,
      dateFrom: searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined,
      dateTo: searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined,
      settled: searchParams.get('settled') ? searchParams.get('settled') === 'true' : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const expenses = await expenseService.getUserExpenses(authResult.user!.userId, filters);
    
    return NextResponse.json({ expenses });
  } catch (error) {
    console.error('Get user expenses error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get user expenses' },
      { status: 500 }
    );
  }
}