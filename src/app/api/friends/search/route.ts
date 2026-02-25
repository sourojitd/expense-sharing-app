import { NextRequest, NextResponse } from 'next/server';
import { FriendService } from '@/lib/services/friend.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const friendService = new FriendService();

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const users = await friendService.searchUsersWithFriendshipStatus(
      authResult.user!.userId,
      query.trim()
    );

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}