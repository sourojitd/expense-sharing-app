import { PrismaClient, Activity, ActivityType } from '@prisma/client';
import { ActivityRepository } from '../repositories/activity.repository';
import { GroupRepository } from '../repositories/group.repository';

export class ActivityService {
  private activityRepository: ActivityRepository;
  private groupRepository: GroupRepository;

  constructor(private prisma: PrismaClient) {
    this.activityRepository = new ActivityRepository(prisma);
    this.groupRepository = new GroupRepository(prisma);
  }

  /**
   * Log an activity. Fire-and-forget: creates activity but does not throw on failure.
   */
  async logActivity(data: {
    type: ActivityType;
    userId: string;
    groupId?: string;
    entityId: string;
    entityType: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.activityRepository.createActivity(data);
    } catch (error) {
      // Fire-and-forget: log the error but don't throw
      console.error('Failed to log activity:', error);
    }
  }

  /**
   * Get the authenticated user's activity feed with cursor-based pagination.
   */
  async getUserFeed(
    userId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ activities: Activity[]; nextCursor?: string }> {
    const limit = options?.limit ?? 20;

    const activities = await this.activityRepository.getUserFeed(userId, {
      limit: limit + 1, // Fetch one extra to determine if there's a next page
      cursor: options?.cursor,
    });

    let nextCursor: string | undefined;
    if (activities.length > limit) {
      const nextItem = activities.pop();
      nextCursor = nextItem?.id;
    }

    return { activities, nextCursor };
  }

  /**
   * Get a group's activity feed with cursor-based pagination.
   * Verifies user is a member of the group first.
   */
  async getGroupFeed(
    groupId: string,
    userId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ activities: Activity[]; nextCursor?: string }> {
    // Verify user is a member of the group
    const isMember = await this.groupRepository.isUserMember(groupId, userId);
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this group');
    }

    const limit = options?.limit ?? 20;

    const activities = await this.activityRepository.getGroupFeed(groupId, {
      limit: limit + 1, // Fetch one extra to determine if there's a next page
      cursor: options?.cursor,
    });

    let nextCursor: string | undefined;
    if (activities.length > limit) {
      const nextItem = activities.pop();
      nextCursor = nextItem?.id;
    }

    return { activities, nextCursor };
  }
}
