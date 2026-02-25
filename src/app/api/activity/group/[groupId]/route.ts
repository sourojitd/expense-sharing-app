import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ActivityService } from '@/lib/services/activity.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const activityService = new ActivityService(prisma);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.user!.userId;
    const { groupId } = await params;
    const { searchParams } = new URL(request.url);

    const limit = searchParams.get('limit')
      ? parseInt(searchParams.get('limit')!, 10)
      : 20;
    const cursor = searchParams.get('cursor') || undefined;

    const result = await activityService.getGroupFeed(groupId, userId, {
      limit,
      cursor,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get group activity feed error:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get group activity feed' },
      { status: 500 }
    );
  }
}
