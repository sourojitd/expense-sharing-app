import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/services/notification.service';
import { ActivityService } from '@/lib/services/activity.service';
import { BalanceService } from '@/lib/services/balance.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const notificationService = new NotificationService(prisma);
const activityService = new ActivityService(prisma);
const balanceService = new BalanceService(prisma);

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const userId = authResult.user!.userId;
    const body = await request.json();

    if (!body.toUserId) {
      return NextResponse.json(
        { error: 'Missing required field: toUserId' },
        { status: 400 }
      );
    }

    if (body.toUserId === userId) {
      return NextResponse.json(
        { error: 'Cannot send a reminder to yourself' },
        { status: 400 }
      );
    }

    // Rate limit: max 1 reminder per user pair per 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReminder = await prisma.notification.findFirst({
      where: {
        userId: body.toUserId,
        type: 'PAYMENT_REMINDER',
        createdAt: { gte: twentyFourHoursAgo },
        data: {
          path: ['fromUserId'],
          equals: userId,
        },
      },
    });

    if (recentReminder) {
      return NextResponse.json(
        { error: 'You already sent a reminder to this user in the last 24 hours' },
        { status: 429 }
      );
    }

    // Get the sender's name
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    // Verify the target user actually owes money
    const balanceSummary = await balanceService.getUserBalances(userId);
    const targetBalance = balanceSummary.balances.find(
      (b) => b.userId === body.toUserId
    );

    if (!targetBalance || targetBalance.amount <= 0) {
      return NextResponse.json(
        { error: 'This user does not owe you any money' },
        { status: 400 }
      );
    }

    const amountOwed = targetBalance.amount;
    const currency = targetBalance.currency;

    // Format currency for the message
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amountOwed);

    // Send notification
    await notificationService.notify(body.toUserId, {
      type: 'PAYMENT_REMINDER',
      title: 'Payment Reminder',
      message: `${sender?.name || 'Someone'} is reminding you to settle up ${formattedAmount}`,
      data: {
        fromUserId: userId,
        fromUserName: sender?.name,
        amount: amountOwed,
        currency,
        groupId: body.groupId || null,
      },
      priority: 'HIGH',
    });

    // Log activity
    await activityService.logActivity({
      type: 'PAYMENT_REMINDER_SENT',
      userId,
      groupId: body.groupId,
      entityId: body.toUserId,
      entityType: 'payment_reminder',
      metadata: {
        toUserId: body.toUserId,
        amount: amountOwed,
        currency,
      },
    });

    return NextResponse.json({
      message: 'Reminder sent successfully',
      reminder: { toUserId: body.toUserId, amount: amountOwed, currency },
    });
  } catch (error) {
    console.error('Send reminder error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send reminder' },
      { status: 500 }
    );
  }
}
