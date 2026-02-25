import { PrismaClient, NotificationType, NotificationPriority, Prisma } from '@prisma/client';

export interface NotificationCreateData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  priority?: NotificationPriority;
}

export interface NotificationQueryOptions {
  limit?: number;
  cursor?: string;
  unreadOnly?: boolean;
}

export class NotificationRepository {
  constructor(private prisma: PrismaClient) {}

  async getNotifications(userId: string, options: NotificationQueryOptions = {}) {
    const { limit = 20, cursor, unreadOnly } = options;

    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    return notifications;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return count;
  }

  async createNotification(data: NotificationCreateData) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: (data.data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        priority: data.priority ?? 'NORMAL',
      },
    });

    return notification;
  }

  async markAsRead(id: string, userId: string) {
    // Verify ownership before updating
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return null;
    }

    const notification = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return result.count;
  }

  async deleteNotification(id: string, userId: string): Promise<boolean> {
    // Verify ownership before deleting
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.notification.delete({
      where: { id },
    });

    return true;
  }
}
