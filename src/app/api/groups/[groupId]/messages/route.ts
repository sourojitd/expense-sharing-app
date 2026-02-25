import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MessageService } from '@/lib/services/message.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const messageService = new MessageService(prisma);

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

    const userId = authResult.user!.userId;
    const { groupId } = await params;

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50;
    const cursor = searchParams.get('cursor') || undefined;

    const result = await messageService.getMessages(groupId, userId, {
      limit,
      cursor,
    });

    return NextResponse.json({
      messages: result.messages,
      nextCursor: result.nextCursor,
    });
  } catch (error) {
    console.error('Get messages error:', error);
    const status = error instanceof Error && error.message.includes('Access denied') ? 403
      : error instanceof Error && error.message.includes('not found') ? 404
      : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get messages' },
      { status }
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

    const userId = authResult.user!.userId;
    const { groupId } = await params;
    const body = await request.json();

    if (!body.content) {
      return NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      );
    }

    const message = await messageService.sendMessage(groupId, userId, body.content);

    return NextResponse.json({
      message: 'Message sent successfully',
      data: message,
    }, { status: 201 });
  } catch (error) {
    console.error('Send message error:', error);
    const status = error instanceof Error && error.message.includes('Access denied') ? 403
      : error instanceof Error && error.message.includes('not found') ? 404
      : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status }
    );
  }
}
