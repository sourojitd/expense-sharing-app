import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const analyticsService = new AnalyticsService(prisma);

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

    const { groupId } = await params;
    const userId = authResult.user!.userId;

    const analytics = await analyticsService.getGroupAnalytics(groupId, userId);

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Get group analytics error:', error);

    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get group analytics' },
      { status: 500 }
    );
  }
}
