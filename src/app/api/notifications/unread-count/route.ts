import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/services/notification.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const notificationService = new NotificationService(prisma);

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

    const count = await notificationService.getUnreadCount(userId);

    return NextResponse.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get unread count' },
      { status: 500 }
    );
  }
}
