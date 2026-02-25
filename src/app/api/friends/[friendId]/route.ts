import { NextRequest, NextResponse } from 'next/server';
import { FriendService } from '@/lib/services/friend.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const friendService = new FriendService();

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { friendId } = await params;

    await friendService.removeFriend(authResult.user!.userId, friendId);

    return NextResponse.json({
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove friend' },
      { status: 500 }
    );
  }
}
