import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationService } from '@/lib/services/notification.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const notificationService = new NotificationService(prisma);

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.user!.userId;

    const count = await notificationService.markAllAsRead(userId);

    return NextResponse.json({
      message: 'All notifications marked as read',
      count,
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}
