import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { RecurringExpenseService } from '@/lib/services/recurring-expense.service';

const recurringExpenseService = new RecurringExpenseService(prisma);

export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const results = await recurringExpenseService.processDueExpenses();

    return NextResponse.json({
      message: 'Recurring expenses processed successfully',
      results,
    });
  } catch (error) {
    console.error('Process recurring expenses error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process recurring expenses' },
      { status: 500 }
    );
  }
}
