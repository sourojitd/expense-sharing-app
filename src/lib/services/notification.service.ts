import { PrismaClient, Notification, NotificationType, NotificationPriority } from '@prisma/client';
import { NotificationRepository } from '../repositories/notification.repository';

export class NotificationService {
  private notificationRepository: NotificationRepository;

  constructor(private prisma: PrismaClient) {
    this.notificationRepository = new NotificationRepository(prisma);
  }

  /**
   * Fire-and-forget notification creation.
   * Never throws - errors are logged silently.
   */
  async notify(
    userId: string,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      data?: Record<string, unknown>;
      priority?: NotificationPriority;
    }
  ): Promise<void> {
    try {
      await this.notificationRepository.createNotification({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        priority: data.priority,
      });
    } catch (error) {
      // Fire-and-forget: log the error but don't throw
      console.error('Failed to create notification:', error);
    }
  }

  /**
   * Get paginated notifications for a user with nextCursor for pagination.
   */
  async getNotifications(
    userId: string,
    options?: { limit?: number; cursor?: string; unreadOnly?: boolean }
  ): Promise<{ notifications: Notification[]; nextCursor?: string }> {
    const limit = options?.limit ?? 20;

    const notifications = await this.notificationRepository.getNotifications(userId, {
      limit: limit + 1, // Fetch one extra to determine if there's a next page
      cursor: options?.cursor,
      unreadOnly: options?.unreadOnly,
    });

    let nextCursor: string | undefined;
    if (notifications.length > limit) {
      const nextItem = notifications.pop();
      nextCursor = nextItem?.id;
    }

    return { notifications, nextCursor };
  }

  /**
   * Get unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationRepository.getUnreadCount(userId);
  }

  /**
   * Mark a single notification as read (verifies ownership).
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepository.markAsRead(id, userId);

    if (!notification) {
      throw new Error('Notification not found or you do not have permission to update it');
    }

    return notification;
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<number> {
    return await this.notificationRepository.markAllAsRead(userId);
  }
}
