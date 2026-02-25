import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GroupService } from '@/lib/services/group.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const groupService = new GroupService(prisma);

export async function GET(
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

    const members = await groupService.getGroupMembers(groupId, authResult.user!.userId);

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Get group members error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get group members' },
      { status: error instanceof Error && error.message.includes('Access denied') ? 403 : 500 }
    );
  }
}

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

    const member = await groupService.addGroupMember(groupId, body, authResult.user!.userId);

    return NextResponse.json({
      message: 'Member added successfully',
      member
    }, { status: 201 });
  } catch (error) {
    console.error('Add group member error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add member' },
      { status: error instanceof Error && error.message.includes('permission') ? 403 : 400 }
    );
  }
}
