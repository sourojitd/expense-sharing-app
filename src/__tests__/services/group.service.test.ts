import { PrismaClient } from '@prisma/client';
import { GroupService } from '../../lib/services/group.service';
import { GroupRepository } from '../../lib/repositories/group.repository';
import {
  CreateGroupData,
  UpdateGroupData,
  AddGroupMemberData,
  GroupWithMembers
} from '../../lib/models/group';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  group: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
  },
  groupMember: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaClient;

// Mock GroupRepository
jest.mock('../../lib/repositories/group.repository');
const MockGroupRepository = GroupRepository as jest.MockedClass<typeof GroupRepository>;

describe('GroupService', () => {
  let groupService: GroupService;
  let mockGroupRepository: jest.Mocked<GroupRepository>;

  const mockGroup = {
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    image: 'https://example.com/image.jpg',
    createdBy: 'creator-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGroupWithMembers: GroupWithMembers = {
    ...mockGroup,
    creator: {
      id: 'creator-id',
      name: 'Creator User',
      email: 'creator@example.com',
    },
    members: [
      {
        id: 'member-1',
        groupId: 'group-1',
        userId: 'admin-id',
        role: 'admin',
        joinedAt: new Date(),
        user: {
          id: 'admin-id',
          name: 'Admin User',
          email: 'admin@example.com',
        },
      },
      {
        id: 'member-2',
        groupId: 'group-1',
        userId: 'member-id',
        role: 'member',
        joinedAt: new Date(),
        user: {
          id: 'member-id',
          name: 'Member User',
          email: 'member@example.com',
        },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGroupRepository = {
      createGroup: jest.fn(),
      getGroupById: jest.fn(),
      getGroupWithMembers: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      getUserGroups: jest.fn(),
      addGroupMember: jest.fn(),
      updateGroupMember: jest.fn(),
      removeGroupMember: jest.fn(),
      getGroupMember: jest.fn(),
      getGroupMembers: jest.fn(),
      isUserMember: jest.fn(),
      searchGroups: jest.fn(),
      getGroupsByIds: jest.fn(),
    } as any;

    MockGroupRepository.mockImplementation(() => mockGroupRepository);
    groupService = new GroupService(mockPrisma);
  });

  describe('createGroup', () => {
    it('should create a group with valid data', async () => {
      const createData: CreateGroupData = {
        name: 'Test Group',
        description: 'A test group',
        image: 'https://example.com/image.jpg',
      };

      mockGroupRepository.createGroup.mockResolvedValue(mockGroup);

      const result = await groupService.createGroup(createData, 'creator-id');

      expect(mockGroupRepository.createGroup).toHaveBeenCalledWith({
        ...createData,
        createdBy: 'creator-id',
      });
      expect(result).toEqual(mockGroup);
    });

    it('should throw error for invalid group data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
      };

      await expect(groupService.createGroup(invalidData, 'creator-id')).rejects.toThrow();
    });
  });

  describe('getGroupById', () => {
    it('should return group by id', async () => {
      mockGroupRepository.getGroupById.mockResolvedValue(mockGroup);

      const result = await groupService.getGroupById('group-1');

      expect(mockGroupRepository.getGroupById).toHaveBeenCalledWith('group-1');
      expect(result).toEqual(mockGroup);
    });

    it('should return null for non-existent group', async () => {
      mockGroupRepository.getGroupById.mockResolvedValue(null);

      const result = await groupService.getGroupById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateGroup', () => {
    it('should update group when user has permission', async () => {
      const updateData: UpdateGroupData = {
        name: 'Updated Group',
        description: 'Updated description',
      };

      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);
      mockGroupRepository.updateGroup.mockResolvedValue({ ...mockGroup, ...updateData });

      const result = await groupService.updateGroup('group-1', updateData, 'creator-id');

      expect(mockGroupRepository.updateGroup).toHaveBeenCalledWith('group-1', updateData);
      expect(result.name).toBe('Updated Group');
    });

    it('should throw error when user lacks permission', async () => {
      const updateData: UpdateGroupData = {
        name: 'Updated Group',
      };

      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);

      await expect(
        groupService.updateGroup('group-1', updateData, 'non-member-id')
      ).rejects.toThrow('Insufficient permissions to update group');
    });

    it('should throw error for non-existent group', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(null);

      await expect(
        groupService.updateGroup('non-existent', {}, 'creator-id')
      ).rejects.toThrow('Group not found');
    });
  });

  describe('deleteGroup', () => {
    it('should delete group when user is creator', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);
      mockGroupRepository.deleteGroup.mockResolvedValue();

      await groupService.deleteGroup('group-1', 'creator-id');

      expect(mockGroupRepository.deleteGroup).toHaveBeenCalledWith('group-1');
    });

    it('should throw error when user is not creator', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);

      await expect(
        groupService.deleteGroup('group-1', 'admin-id')
      ).rejects.toThrow('Only group creator can delete the group');
    });
  });

  describe('addGroupMember', () => {
    it('should add member when user has permission', async () => {
      const memberData: AddGroupMemberData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'member',
      };

      const newMember = {
        id: 'member-3',
        groupId: 'group-1',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'member' as const,
        joinedAt: new Date(),
      };

      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);
      mockGroupRepository.isUserMember.mockResolvedValue(false);
      mockGroupRepository.addGroupMember.mockResolvedValue(newMember);

      const result = await groupService.addGroupMember('group-1', memberData, 'creator-id');

      expect(mockGroupRepository.addGroupMember).toHaveBeenCalledWith('group-1', memberData);
      expect(result).toEqual(newMember);
    });

    it('should throw error when user lacks permission', async () => {
      const memberData: AddGroupMemberData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'member',
      };

      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);

      await expect(
        groupService.addGroupMember('group-1', memberData, 'member-id')
      ).rejects.toThrow('Insufficient permissions to add members');
    });

    it('should throw error when user is already a member', async () => {
      const memberData: AddGroupMemberData = {
        userId: '123e4567-e89b-12d3-a456-426614174001', // Already a member
        role: 'member',
      };

      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);
      mockGroupRepository.isUserMember.mockResolvedValue(true);

      await expect(
        groupService.addGroupMember('group-1', memberData, 'creator-id')
      ).rejects.toThrow('User is already a member of this group');
    });
  });

  describe('removeGroupMember', () => {
    it('should remove member when user has permission', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);
      mockGroupRepository.getGroupMember.mockResolvedValue(mockGroupWithMembers.members[1]);
      mockGroupRepository.removeGroupMember.mockResolvedValue();

      await groupService.removeGroupMember('group-1', 'member-id', 'creator-id');

      expect(mockGroupRepository.removeGroupMember).toHaveBeenCalledWith('group-1', 'member-id');
    });

    it('should throw error when trying to remove creator', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);
      mockGroupRepository.getGroupMember.mockResolvedValue({
        id: 'creator-member',
        groupId: 'group-1',
        userId: 'creator-id',
        role: 'admin',
        joinedAt: new Date(),
      });

      await expect(
        groupService.removeGroupMember('group-1', 'creator-id', 'creator-id')
      ).rejects.toThrow('Cannot remove group creator');
    });

    it('should throw error when user lacks permission', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);

      await expect(
        groupService.removeGroupMember('group-1', 'admin-id', 'member-id')
      ).rejects.toThrow('Insufficient permissions to remove members');
    });
  });

  describe('leaveGroup', () => {
    it('should allow member to leave group', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);
      mockGroupRepository.removeGroupMember.mockResolvedValue();

      await groupService.leaveGroup('group-1', 'member-id');

      expect(mockGroupRepository.removeGroupMember).toHaveBeenCalledWith('group-1', 'member-id');
    });

    it('should delete group when creator leaves empty group', async () => {
      const emptyGroup = { ...mockGroupWithMembers, members: [] };
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(emptyGroup);
      mockGroupRepository.deleteGroup.mockResolvedValue();

      await groupService.leaveGroup('group-1', 'creator-id');

      expect(mockGroupRepository.deleteGroup).toHaveBeenCalledWith('group-1');
    });

    it('should throw error when creator tries to leave group with members', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);

      await expect(
        groupService.leaveGroup('group-1', 'creator-id')
      ).rejects.toThrow('Cannot leave group');
    });
  });

  describe('transferOwnership', () => {
    it('should transfer ownership to existing member', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);
      mockGroupRepository.getGroupMember.mockResolvedValue(mockGroupWithMembers.members[0]);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });

      await groupService.transferOwnership('group-1', 'admin-id', 'creator-id');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error when non-creator tries to transfer ownership', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);

      await expect(
        groupService.transferOwnership('group-1', 'admin-id', 'member-id')
      ).rejects.toThrow('Only group creator can transfer ownership');
    });

    it('should throw error when new owner is not a member', async () => {
      mockGroupRepository.getGroupWithMembers.mockResolvedValue(mockGroupWithMembers);
      mockGroupRepository.getGroupMember.mockResolvedValue(null);

      await expect(
        groupService.transferOwnership('group-1', '123e4567-e89b-12d3-a456-426614174000', 'creator-id')
      ).rejects.toThrow('New owner must be a member of the group');
    });
  });

  describe('getUserGroups', () => {
    it('should return user groups', async () => {
      const mockGroupSummaries = [
        {
          id: 'group-1',
          name: 'Test Group',
          image: null,
          memberCount: 3,
          totalExpenses: 5,
          yourBalance: 0,
        },
      ];

      mockGroupRepository.getUserGroups.mockResolvedValue(mockGroupSummaries);

      const result = await groupService.getUserGroups('user-id');

      expect(mockGroupRepository.getUserGroups).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockGroupSummaries);
    });
  });

  describe('searchGroups', () => {
    it('should search groups by query', async () => {
      const mockResults = [
        {
          id: 'group-1',
          name: 'Test Group',
          image: null,
          memberCount: 3,
          totalExpenses: 5,
          yourBalance: 0,
        },
      ];

      mockGroupRepository.searchGroups.mockResolvedValue(mockResults);

      const result = await groupService.searchGroups('test', 'user-id');

      expect(mockGroupRepository.searchGroups).toHaveBeenCalledWith('test', 'user-id');
      expect(result).toEqual(mockResults);
    });

    it('should return empty array for empty query', async () => {
      const result = await groupService.searchGroups('', 'user-id');

      expect(result).toEqual([]);
      expect(mockGroupRepository.searchGroups).not.toHaveBeenCalled();
    });
  });
});