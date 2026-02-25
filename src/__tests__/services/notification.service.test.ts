import { PrismaClient, Notification } from '@prisma/client';
import { NotificationService } from '../../lib/services/notification.service';
import { NotificationRepository } from '../../lib/repositories/notification.repository';

// Mock the repository module
jest.mock('../../lib/repositories/notification.repository');

const MockNotificationRepository = NotificationRepository as jest.MockedClass<typeof NotificationRepository>;

// Mock Prisma Client
const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
} as unknown as PrismaClient;

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockRepo: jest.Mocked<NotificationRepository>;

  const mockNotification: Notification = {
    id: 'notif-1',
    userId: 'user-a',
    type: 'EXPENSE_ADDED',
    title: 'New Expense',
    message: 'Bob added a new expense',
    data: null,
    isRead: false,
    priority: 'NORMAL',
    createdAt: new Date('2024-06-01'),
  };

  beforeEach(() => {
    MockNotificationRepository.mockClear();
    jest.clearAllMocks();

    notificationService = new NotificationService(mockPrisma);
    mockRepo = MockNotificationRepository.mock.instances[0] as jest.Mocked<NotificationRepository>;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('notify', () => {
    it('should create a notification (fire-and-forget, never throws)', async () => {
      mockRepo.createNotification.mockResolvedValue(mockNotification);

      // notify should not throw
      await expect(
        notificationService.notify('user-a', {
          type: 'EXPENSE_ADDED',
          title: 'New Expense',
          message: 'Bob added a new expense',
        })
      ).resolves.toBeUndefined();

      expect(mockRepo.createNotification).toHaveBeenCalledWith({
        userId: 'user-a',
        type: 'EXPENSE_ADDED',
        title: 'New Expense',
        message: 'Bob added a new expense',
        data: undefined,
        priority: undefined,
      });
    });

    it('should silently handle errors without throwing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockRepo.createNotification.mockRejectedValue(new Error('Database error'));

      // Should NOT throw even though repository threw
      await expect(
        notificationService.notify('user-a', {
          type: 'EXPENSE_ADDED',
          title: 'New Expense',
          message: 'Something happened',
        })
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create notification:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should pass optional data and priority to repository', async () => {
      mockRepo.createNotification.mockResolvedValue({
        ...mockNotification,
        priority: 'HIGH',
        data: { groupId: 'group-1' },
      });

      await notificationService.notify('user-a', {
        type: 'GROUP_INVITE',
        title: 'Group Invite',
        message: 'You have been invited',
        data: { groupId: 'group-1' },
        priority: 'HIGH',
      });

      expect(mockRepo.createNotification).toHaveBeenCalledWith({
        userId: 'user-a',
        type: 'GROUP_INVITE',
        title: 'Group Invite',
        message: 'You have been invited',
        data: { groupId: 'group-1' },
        priority: 'HIGH',
      });
    });
  });

  describe('getNotifications', () => {
    it('should return paginated results with nextCursor when more items exist', async () => {
      // Default limit is 20. Service fetches limit+1 = 21 to detect next page.
      const notifications = Array.from({ length: 21 }, (_, i) => ({
        ...mockNotification,
        id: `notif-${i + 1}`,
      }));

      mockRepo.getNotifications.mockResolvedValue(notifications);

      const result = await notificationService.getNotifications('user-a');

      // Should return 20 items (popped the 21st)
      expect(result.notifications).toHaveLength(20);
      // nextCursor should be the id of the 21st item (which was popped)
      expect(result.nextCursor).toBe('notif-21');

      expect(mockRepo.getNotifications).toHaveBeenCalledWith('user-a', {
        limit: 21, // limit + 1
        cursor: undefined,
        unreadOnly: undefined,
      });
    });

    it('should return results without nextCursor when no more items', async () => {
      const notifications = Array.from({ length: 5 }, (_, i) => ({
        ...mockNotification,
        id: `notif-${i + 1}`,
      }));

      mockRepo.getNotifications.mockResolvedValue(notifications);

      const result = await notificationService.getNotifications('user-a');

      expect(result.notifications).toHaveLength(5);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should pass cursor and limit options to repository', async () => {
      mockRepo.getNotifications.mockResolvedValue([]);

      await notificationService.getNotifications('user-a', {
        limit: 10,
        cursor: 'notif-5',
        unreadOnly: true,
      });

      expect(mockRepo.getNotifications).toHaveBeenCalledWith('user-a', {
        limit: 11, // 10 + 1
        cursor: 'notif-5',
        unreadOnly: true,
      });
    });

    it('should return empty array when no notifications exist', async () => {
      mockRepo.getNotifications.mockResolvedValue([]);

      const result = await notificationService.getNotifications('user-a');

      expect(result.notifications).toHaveLength(0);
      expect(result.nextCursor).toBeUndefined();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockRepo.getUnreadCount.mockResolvedValue(7);

      const result = await notificationService.getUnreadCount('user-a');

      expect(result).toBe(7);
      expect(mockRepo.getUnreadCount).toHaveBeenCalledWith('user-a');
    });

    it('should return 0 when there are no unread notifications', async () => {
      mockRepo.getUnreadCount.mockResolvedValue(0);

      const result = await notificationService.getUnreadCount('user-a');

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const readNotification = { ...mockNotification, isRead: true };
      mockRepo.markAsRead.mockResolvedValue(readNotification);

      const result = await notificationService.markAsRead('notif-1', 'user-a');

      expect(result.isRead).toBe(true);
      expect(mockRepo.markAsRead).toHaveBeenCalledWith('notif-1', 'user-a');
    });

    it('should throw error when notification not found or not owned by user', async () => {
      mockRepo.markAsRead.mockResolvedValue(null);

      await expect(
        notificationService.markAsRead('notif-999', 'user-a')
      ).rejects.toThrow('Notification not found or you do not have permission to update it');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and return count', async () => {
      mockRepo.markAllAsRead.mockResolvedValue(5);

      const result = await notificationService.markAllAsRead('user-a');

      expect(result).toBe(5);
      expect(mockRepo.markAllAsRead).toHaveBeenCalledWith('user-a');
    });

    it('should return 0 when there are no unread notifications', async () => {
      mockRepo.markAllAsRead.mockResolvedValue(0);

      const result = await notificationService.markAllAsRead('user-a');

      expect(result).toBe(0);
    });
  });
});
