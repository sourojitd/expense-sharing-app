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

    const friends = await friendService.getFriends(authResult.user!.userId);
    
    return NextResponse.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json(
      { error: 'Failed to get friends' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { receiverId } = body;

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Receiver ID is required' },
        { status: 400 }
      );
    }

    const friendRequest = await friendService.sendFriendRequest(
      authResult.user!.userId,
      receiverId
    );

    return NextResponse.json({
      message: 'Friend request sent successfully',
      friendRequest
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send friend request' },
      { status: 500 }
    );
  }
}