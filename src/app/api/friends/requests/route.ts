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
    const type = searchParams.get('type') || 'received';

    let requests;
    if (type === 'sent') {
      requests = await friendService.getSentFriendRequests(authResult.user!.userId);
    } else {
      requests = await friendService.getPendingFriendRequests(authResult.user!.userId);
    }

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    return NextResponse.json(
      { error: 'Failed to get friend requests' },
      { status: 500 }
    );
  }
}