import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/services/payment.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const paymentService = new PaymentService(prisma);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { paymentId } = await params;
    const payment = await paymentService.confirmPayment(paymentId, authResult.user!.userId);

    return NextResponse.json({
      message: 'Payment confirmed successfully',
      payment,
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to confirm payment' },
      { status: 400 }
    );
  }
}
