import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ActivityService } from '@/lib/services/activity.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const activityService = new ActivityService(prisma);

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

    const result = await activityService.getUserFeed(userId, { limit, cursor });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get activity feed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get activity feed' },
      { status: 500 }
    );
  }
}
