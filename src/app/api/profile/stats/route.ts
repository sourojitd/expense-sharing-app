import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/services/profile.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const profileService = new ProfileService();

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const stats = await profileService.getProfileStats(authResult.user!.userId);

    return NextResponse.json({ stats });
  } catch (error) {
    console.error('Profile stats fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile statistics' },
      { status: 500 }
    );
  }
}