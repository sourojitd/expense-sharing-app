import { PrismaClient, MessageType } from '@prisma/client';

export interface MessageCreateData {
  groupId: string;
  userId: string;
  content: string;
  type?: MessageType;
}

export interface MessageQueryOptions {
  limit?: number;
  cursor?: string;
}

export class MessageRepository {
  constructor(private prisma: PrismaClient) {}

  async getMessages(groupId: string, options: MessageQueryOptions = {}) {
    const { limit = 50, cursor } = options;

    const messages = await this.prisma.message.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    return messages;
  }

  async createMessage(data: MessageCreateData) {
    const message = await this.prisma.message.create({
      data: {
        groupId: data.groupId,
        userId: data.userId,
        content: data.content,
        type: data.type || 'TEXT',
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

    return message;
  }

  async getMessageCount(groupId: string) {
    const count = await this.prisma.message.count({
      where: { groupId },
    });

    return count;
  }
}
