import { PrismaClient } from '@prisma/client';
import { 
  Group, 
  GroupMember, 
  GroupWithMembers, 
  GroupSummary,
  CreateGroupData,
  UpdateGroupData,
  AddGroupMemberData,
  UpdateGroupMemberData 
} from '../models/group';

export class GroupRepository {
  constructor(private prisma: PrismaClient) {}

  async createGroup(data: CreateGroupData & { createdBy: string }): Promise<Group> {
    const group = await this.prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        image: data.image,
        type: data.type || 'FRIENDS',
        createdBy: data.createdBy,
      },
    });

    return group;
  }

  async getGroupById(id: string): Promise<Group | null> {
    const group = await this.prisma.group.findUnique({
      where: { id },
    });

    return group;
  }

  async getGroupWithMembers(id: string): Promise<GroupWithMembers | null> {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePicture: true,
              },
            },
          },
        },
      },
    });

    return group;
  }

  async updateGroup(id: string, data: UpdateGroupData): Promise<Group> {
    const group = await this.prisma.group.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.image !== undefined && { image: data.image }),
        ...(data.type !== undefined && { type: data.type }),
      },
    });

    return group;
  }

  async deleteGroup(id: string): Promise<void> {
    await this.prisma.group.delete({
      where: { id },
    });
  }

  async getUserGroups(userId: string): Promise<GroupSummary[]> {
    // Get groups where user is creator
    const createdGroups = await this.prisma.group.findMany({
      where: { createdBy: userId },
      select: {
        id: true,
        name: true,
        image: true,
        type: true,
        _count: {
          select: {
            members: true,
            expenses: true,
          },
        },
      },
    });

    // Get groups where user is a member
    const memberGroups = await this.prisma.group.findMany({
      where: {
        members: {
          some: { userId },
        },
      },
      select: {
        id: true,
        name: true,
        image: true,
        type: true,
        _count: {
          select: {
            members: true,
            expenses: true,
          },
        },
      },
    });

    // Combine and deduplicate
    const allGroups = [...createdGroups, ...memberGroups];
    const uniqueGroups = allGroups.filter(
      (group, index, self) => index === self.findIndex(g => g.id === group.id)
    );

    // Transform to GroupSummary format
    return uniqueGroups.map(group => ({
      id: group.id,
      name: group.name,
      image: group.image,
      type: group.type,
      memberCount: group._count.members + 1, // +1 for creator
      totalExpenses: group._count.expenses,
      yourBalance: 0, // TODO: Calculate actual balance
    }));
  }

  async addGroupMember(groupId: string, data: AddGroupMemberData): Promise<GroupMember> {
    const member = await this.prisma.groupMember.create({
      data: {
        groupId,
        userId: data.userId,
        role: data.role,
      },
    });

    return member;
  }

  async updateGroupMember(groupId: string, userId: string, data: UpdateGroupMemberData): Promise<GroupMember> {
    const member = await this.prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      data: {
        role: data.role,
      },
    });

    return member;
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await this.prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });
  }

  async getGroupMember(groupId: string, userId: string): Promise<GroupMember | null> {
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return member;
  }

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
    });

    return members;
  }

  async isUserMember(groupId: string, userId: string): Promise<boolean> {
    // Check if user is creator
    const group = await this.prisma.group.findFirst({
      where: {
        id: groupId,
        createdBy: userId,
      },
    });

    if (group) return true;

    // Check if user is a member
    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return !!member;
  }

  async searchGroups(query: string, userId: string): Promise<GroupSummary[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
        AND: [
          {
            OR: [
              { createdBy: userId },
              { members: { some: { userId } } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        image: true,
        type: true,
        _count: {
          select: {
            members: true,
            expenses: true,
          },
        },
      },
    });

    return groups.map(group => ({
      id: group.id,
      name: group.name,
      image: group.image,
      type: group.type,
      memberCount: group._count.members + 1,
      totalExpenses: group._count.expenses,
      yourBalance: 0, // TODO: Calculate actual balance
    }));
  }

  async getGroupsByIds(groupIds: string[]): Promise<Group[]> {
    const groups = await this.prisma.group.findMany({
      where: {
        id: { in: groupIds },
      },
    });

    return groups;
  }
}