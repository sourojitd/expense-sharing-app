import { NextRequest, NextResponse } from 'next/server';
import { FriendService } from '@/lib/services/friend.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const friendService = new FriendService();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;
    const { requestId } = await params;

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    let result;
    if (action === 'accept') {
      result = await friendService.acceptFriendRequest(requestId, authResult.user!.userId);
    } else {
      result = await friendService.rejectFriendRequest(requestId, authResult.user!.userId);
    }

    return NextResponse.json({
      message: `Friend request ${action}ed successfully`,
      friendRequest: result
    });
  } catch (error) {
    console.error('Update friend request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update friend request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { requestId } = await params;

    await friendService.cancelFriendRequest(requestId, authResult.user!.userId);

    return NextResponse.json({
      message: 'Friend request cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel friend request error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel friend request' },
      { status: 500 }
    );
  }
}
