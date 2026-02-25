import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/services/payment.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const paymentService = new PaymentService(prisma);

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
    if (!body.toUserId || !body.amount || !body.currency || !body.method) {
      return NextResponse.json(
        { error: 'Missing required fields: toUserId, amount, currency, method' },
        { status: 400 }
      );
    }

    const userId = authResult.user!.userId;

    const payment = await paymentService.recordPayment(
      {
        fromUserId: userId,
        toUserId: body.toUserId,
        amount: body.amount,
        currency: body.currency,
        method: body.method,
        groupId: body.groupId,
        note: body.note,
      },
      userId
    );

    return NextResponse.json({
      message: 'Payment recorded successfully',
      payment,
    }, { status: 201 });
  } catch (error) {
    console.error('Record payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to record payment' },
      { status: 400 }
    );
  }
}

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

    const filters = {
      status: searchParams.get('status') as import('@prisma/client').PaymentStatus | undefined,
      groupId: searchParams.get('groupId') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
    };

    const payments = await paymentService.getPayments(authResult.user!.userId, filters);

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Get payments error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get payments' },
      { status: 500 }
    );
  }
}
