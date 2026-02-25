import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GroupService } from '@/lib/services/group.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const groupService = new GroupService(prisma);

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
    const search = searchParams.get('search');

    let groups;
    if (search) {
      groups = await groupService.searchGroups(search, authResult.user!.userId);
    } else {
      groups = await groupService.getUserGroups(authResult.user!.userId);
    }
    
    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json(
      { error: 'Failed to get groups' },
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
    
    const group = await groupService.createGroup(body, authResult.user!.userId);

    return NextResponse.json({
      message: 'Group created successfully',
      group
    }, { status: 201 });
  } catch (error) {
    console.error('Create group error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create group' },
      { status: 400 }
    );
  }
}