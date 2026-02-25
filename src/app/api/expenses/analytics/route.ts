import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AnalyticsService } from '@/lib/services/analytics.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const analyticsService = new AnalyticsService(prisma);

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

    const analytics = await analyticsService.getPersonalAnalytics(userId);

    return NextResponse.json({ analytics });
  } catch (error) {
    console.error('Get personal analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get personal analytics' },
      { status: 500 }
    );
  }
}
