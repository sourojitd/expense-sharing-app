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
    const body = await request.json();
    const { newOwnerId } = body;

    if (!newOwnerId) {
      return NextResponse.json(
        { error: 'New owner ID is required' },
        { status: 400 }
      );
    }

    await groupService.transferOwnership(groupId, newOwnerId, authResult.user!.userId);

    return NextResponse.json({
      message: 'Ownership transferred successfully'
    });
  } catch (error) {
    console.error('Transfer ownership error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to transfer ownership' },
      { status: error instanceof Error && error.message.includes('creator') ? 403 : 400 }
    );
  }
}
