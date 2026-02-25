import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GroupService } from '@/lib/services/group.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const groupService = new GroupService(prisma);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { groupId, memberId } = await params;
    const body = await request.json();

    const member = await groupService.updateGroupMember(groupId, memberId, body, authResult.user!.userId);

    return NextResponse.json({
      message: 'Member updated successfully',
      member
    });
  } catch (error) {
    console.error('Update group member error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update member' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; memberId: string }> }
) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const { groupId, memberId } = await params;

    await groupService.removeGroupMember(groupId, memberId, authResult.user!.userId);

    return NextResponse.json({
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove group member error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove member' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 400 }
    );
  }
}
