import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GroupService } from '@/lib/services/group.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const groupService = new GroupService(prisma);

export async function POST(
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

    await groupService.leaveGroup(groupId, authResult.user!.userId);

    return NextResponse.json({
      message: 'Left group successfully'
    });
  } catch (error) {
    console.error('Leave group error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to leave group' },
      { status: 400 }
    );
  }
}
