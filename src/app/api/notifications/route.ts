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
    const { searchParams } = new URL(request.url);

    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 20;
    const cursor = searchParams.get('cursor') || undefined;
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const result = await notificationService.getNotifications(userId, {
      limit,
      cursor,
      unreadOnly,
    });

    const unreadCount = await notificationService.getUnreadCount(userId);

    return NextResponse.json({
      notifications: result.notifications,
      nextCursor: result.nextCursor,
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get notifications' },
      { status: 500 }
    );
  }
}
