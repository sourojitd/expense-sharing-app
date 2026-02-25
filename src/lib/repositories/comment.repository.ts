import { PrismaClient } from '@prisma/client';

export interface CommentCreateData {
  expenseId: string;
  userId: string;
  content: string;
}

export interface CommentUpdateData {
  content: string;
}

export interface CommentQueryOptions {
  limit?: number;
  cursor?: string;
}

export class CommentRepository {
  constructor(private prisma: PrismaClient) {}

  async getCommentsByExpense(expenseId: string, options: CommentQueryOptions = {}) {
    const { limit = 50, cursor } = options;

    const comments = await this.prisma.expenseComment.findMany({
      where: { expenseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    return comments;
  }

  async getCommentById(id: string) {
    const comment = await this.prisma.expenseComment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });

    return comment;
  }

  async createComment(data: CommentCreateData) {
    const comment = await this.prisma.expenseComment.create({
      data: {
        expenseId: data.expenseId,
        userId: data.userId,
        content: data.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });

    return comment;
  }

  async updateComment(id: string, userId: string, data: CommentUpdateData) {
    // Verify ownership before updating
    const existing = await this.prisma.expenseComment.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return null;
    }

    const comment = await this.prisma.expenseComment.update({
      where: { id },
      data: {
        content: data.content,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
      },
    });

    return comment;
  }

  async deleteComment(id: string, userId: string) {
    // Verify ownership before deleting
    const existing = await this.prisma.expenseComment.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.expenseComment.delete({
      where: { id },
    });

    return true;
  }
}
