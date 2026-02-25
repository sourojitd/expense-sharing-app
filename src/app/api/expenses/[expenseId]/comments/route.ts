import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CommentService } from '@/lib/services/comment.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const commentService = new CommentService(prisma);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
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
    const { expenseId } = await params;

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const cursor = searchParams.get('cursor') || undefined;

    const comments = await commentService.getCommentsByExpense(expenseId, userId, {
      limit,
      cursor,
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    const status = error instanceof Error && error.message.includes('Access denied') ? 403
      : error instanceof Error && error.message.includes('not found') ? 404
      : 500;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get comments' },
      { status }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> }
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
    const { expenseId } = await params;
    const body = await request.json();

    if (!body.content) {
      return NextResponse.json(
        { error: 'Missing required field: content' },
        { status: 400 }
      );
    }

    const comment = await commentService.createComment({
      expenseId,
      userId,
      content: body.content,
    });

    return NextResponse.json({
      message: 'Comment created successfully',
      comment,
    }, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    const status = error instanceof Error && error.message.includes('Access denied') ? 403
      : error instanceof Error && error.message.includes('not found') ? 404
      : 400;
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create comment' },
      { status }
    );
  }
}
