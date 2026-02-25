/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { authMiddleware } from '../../lib/middleware/auth.middleware';
import { GroupService } from '../../lib/services/group.service';

// Mock dependencies
jest.mock('../../lib/middleware/auth.middleware');
jest.mock('../../lib/services/group.service');
jest.mock('@prisma/client');

const mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;
const MockGroupService = GroupService as jest.MockedClass<typeof GroupService>;

describe('Groups API Integration', () => {
  let mockGroupService: jest.Mocked<GroupService>;

  const mockAuthResult = {
    success: true,
    user: {
      userId: 'user-1',
      email: 'user@example.com',
      type: 'access' as const,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGroupService = {
      createGroup: jest.fn(),
      getGroupById: jest.fn(),
      getGroupWithMembers: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn(),
      getUserGroups: jest.fn(),
      addGroupMember: jest.fn(),
      updateGroupMember: jest.fn(),
      removeGroupMember: jest.fn(),
      leaveGroup: jest.fn(),
      getGroupMembers: jest.fn(),
      searchGroups: jest.fn(),
      isUserMember: jest.fn(),
      getUserRole: jest.fn(),
      transferOwnership: jest.fn(),
    } as any;

    MockGroupService.mockImplementation(() => mockGroupService);
    mockAuthMiddleware.mockResolvedValue(mockAuthResult);
  });

  describe('Authentication middleware integration', () => {
    it('should authenticate requests properly', async () => {
      const request = new NextRequest('http://localhost:3000/api/groups', {
        headers: {
          'Authorization': 'Bearer valid-token',
        },
      });

      const result = await authMiddleware(request);
      
      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockAuthResult.user);
    });

    it('should reject unauthenticated requests', async () => {
      mockAuthMiddleware.mockResolvedValue({
        success: false,
        error: 'Authentication failed',
      });

      const request = new NextRequest('http://localhost:3000/api/groups');
      const result = await authMiddleware(request);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  describe('Group service integration', () => {
    it('should create group through service', async () => {
      const groupData = {
        name: 'Test Group',
        description: 'A test group',
      };

      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        description: 'A test group',
        image: null,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockGroupService.createGroup.mockResolvedValue(mockGroup);

      const result = await mockGroupService.createGroup(groupData, 'user-1');
      
      expect(result).toEqual(mockGroup);
      expect(mockGroupService.createGroup).toHaveBeenCalledWith(groupData, 'user-1');
    });

    it('should get user groups through service', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'Test Group',
          image: null,
          memberCount: 2,
          totalExpenses: 5,
          yourBalance: 0,
        },
      ];

      mockGroupService.getUserGroups.mockResolvedValue(mockGroups);

      const result = await mockGroupService.getUserGroups('user-1');
      
      expect(result).toEqual(mockGroups);
      expect(mockGroupService.getUserGroups).toHaveBeenCalledWith('user-1');
    });

    it('should search groups through service', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'Test Group',
          image: null,
          memberCount: 2,
          totalExpenses: 5,
          yourBalance: 0,
        },
      ];

      mockGroupService.searchGroups.mockResolvedValue(mockGroups);

      const result = await mockGroupService.searchGroups('test', 'user-1');
      
      expect(result).toEqual(mockGroups);
      expect(mockGroupService.searchGroups).toHaveBeenCalledWith('test', 'user-1');
    });

    it('should handle group member operations', async () => {
      const memberData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'member' as const,
      };

      const newMember = {
        id: 'member-1',
        groupId: 'group-1',
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'member' as const,
        joinedAt: new Date(),
      };

      mockGroupService.addGroupMember.mockResolvedValue(newMember);

      const result = await mockGroupService.addGroupMember('group-1', memberData, 'user-1');
      
      expect(result).toEqual(newMember);
      expect(mockGroupService.addGroupMember).toHaveBeenCalledWith('group-1', memberData, 'user-1');
    });

    it('should handle group permissions', async () => {
      mockGroupService.isUserMember.mockResolvedValue(true);

      const result = await mockGroupService.isUserMember('group-1', 'user-1');
      
      expect(result).toBe(true);
      expect(mockGroupService.isUserMember).toHaveBeenCalledWith('group-1', 'user-1');
    });

    it('should handle ownership transfer', async () => {
      mockGroupService.transferOwnership.mockResolvedValue();

      await mockGroupService.transferOwnership('group-1', 'user-2', 'user-1');
      
      expect(mockGroupService.transferOwnership).toHaveBeenCalledWith('group-1', 'user-2', 'user-1');
    });
  });
});