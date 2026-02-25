import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentService } from '@/lib/services/payment.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const paymentService = new PaymentService(prisma);

export async function GET(
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
    const payment = await paymentService.getPaymentById(paymentId, authResult.user!.userId);

    return NextResponse.json({ payment });
  } catch (error) {
    console.error('Get payment error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get payment' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 :
               error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    );
  }
}
