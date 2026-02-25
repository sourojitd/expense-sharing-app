import { PrismaClient, Activity, ActivityType, Prisma } from '@prisma/client';

export class ActivityRepository {
  constructor(private prisma: PrismaClient) {}

  async createActivity(data: {
    type: ActivityType;
    userId: string;
    groupId?: string;
    entityId: string;
    entityType: string;
    metadata?: Record<string, unknown>;
  }): Promise<Activity> {
    const activity = await this.prisma.activity.create({
      data: {
        type: data.type,
        userId: data.userId,
        groupId: data.groupId,
        entityId: data.entityId,
        entityType: data.entityType,
        metadata: (data.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    return activity;
  }

  async getUserFeed(
    userId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<Activity[]> {
    const limit = options?.limit ?? 20;
    const cursor = options?.cursor;

    // Find all group IDs the user belongs to (as member or creator)
    const memberGroups = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const createdGroups = await this.prisma.group.findMany({
      where: { createdBy: userId },
      select: { id: true },
    });

    const groupIds = [
      ...new Set([
        ...memberGroups.map((m) => m.groupId),
        ...createdGroups.map((g) => g.id),
      ]),
    ];

    const activities = await this.prisma.activity.findMany({
      where: {
        OR: [
          // Activities in groups the user belongs to
          ...(groupIds.length > 0
            ? [{ groupId: { in: groupIds } }]
            : []),
          // Activities created by the user
          { userId },
          // Personal activities involving the user (no group)
          { groupId: null, userId },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    return activities;
  }

  async getGroupFeed(
    groupId: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<Activity[]> {
    const limit = options?.limit ?? 20;
    const cursor = options?.cursor;

    const activities = await this.prisma.activity.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    return activities;
  }
}
