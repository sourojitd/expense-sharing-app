import {
  GroupValidator,
  GroupModel,
  GroupWithMembers,
} from '../../lib/models/group';

describe('GroupValidator', () => {
  describe('validateCreateGroup', () => {
    it('should validate valid group creation data', () => {
      const validData = {
        name: 'Test Group',
        description: 'A test group',
        image: 'https://example.com/image.jpg',
      };

      const result = GroupValidator.validateCreateGroup(validData);
      expect(result).toEqual(validData);
    });

    it('should validate group with only name', () => {
      const validData = {
        name: 'Test Group',
      };

      const result = GroupValidator.validateCreateGroup(validData);
      expect(result).toEqual(validData);
    });

    it('should throw error for empty name', () => {
      const invalidData = {
        name: '',
      };

      expect(() => GroupValidator.validateCreateGroup(invalidData)).toThrow('Group name is required');
    });

    it('should throw error for name too long', () => {
      const invalidData = {
        name: 'a'.repeat(101),
      };

      expect(() => GroupValidator.validateCreateGroup(invalidData)).toThrow('Group name must be less than 100 characters');
    });

    it('should throw error for description too long', () => {
      const invalidData = {
        name: 'Test Group',
        description: 'a'.repeat(501),
      };

      expect(() => GroupValidator.validateCreateGroup(invalidData)).toThrow('Description must be less than 500 characters');
    });

    it('should throw error for invalid image URL', () => {
      const invalidData = {
        name: 'Test Group',
        image: 'not-a-url',
      };

      expect(() => GroupValidator.validateCreateGroup(invalidData)).toThrow('Invalid image URL');
    });
  });

  describe('validateUpdateGroup', () => {
    it('should validate valid update data', () => {
      const validData = {
        name: 'Updated Group',
        description: 'Updated description',
      };

      const result = GroupValidator.validateUpdateGroup(validData);
      expect(result).toEqual(validData);
    });

    it('should validate empty update data', () => {
      const validData = {};

      const result = GroupValidator.validateUpdateGroup(validData);
      expect(result).toEqual(validData);
    });

    it('should throw error for invalid name in update', () => {
      const invalidData = {
        name: '',
      };

      expect(() => GroupValidator.validateUpdateGroup(invalidData)).toThrow('Group name is required');
    });
  });

  describe('validateAddMember', () => {
    it('should validate valid add member data', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'admin' as const,
      };

      const result = GroupValidator.validateAddMember(validData);
      expect(result).toEqual(validData);
    });

    it('should default role to member', () => {
      const validData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = GroupValidator.validateAddMember(validData);
      expect(result.role).toBe('member');
    });

    it('should throw error for invalid user ID', () => {
      const invalidData = {
        userId: 'invalid-uuid',
      };

      expect(() => GroupValidator.validateAddMember(invalidData)).toThrow('Invalid user ID');
    });

    it('should throw error for invalid role', () => {
      const invalidData = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'invalid-role',
      };

      expect(() => GroupValidator.validateAddMember(invalidData)).toThrow();
    });
  });

  describe('validateUpdateMember', () => {
    it('should validate valid update member data', () => {
      const validData = {
        role: 'admin' as const,
      };

      const result = GroupValidator.validateUpdateMember(validData);
      expect(result).toEqual(validData);
    });

    it('should throw error for invalid role', () => {
      const invalidData = {
        role: 'invalid-role',
      };

      expect(() => GroupValidator.validateUpdateMember(invalidData)).toThrow();
    });
  });

  describe('validateGroupName', () => {
    it('should return true for valid name', () => {
      expect(GroupValidator.validateGroupName('Valid Group')).toBe(true);
    });

    it('should return false for empty name', () => {
      expect(GroupValidator.validateGroupName('')).toBe(false);
    });

    it('should return false for name too long', () => {
      expect(GroupValidator.validateGroupName('a'.repeat(101))).toBe(false);
    });
  });

  describe('validateMemberRole', () => {
    it('should return true for valid roles', () => {
      expect(GroupValidator.validateMemberRole('member')).toBe(true);
      expect(GroupValidator.validateMemberRole('admin')).toBe(true);
    });

    it('should return false for invalid role', () => {
      expect(GroupValidator.validateMemberRole('invalid')).toBe(false);
    });
  });
});

describe('GroupModel', () => {
  const mockGroup: GroupWithMembers = {
    id: 'group-1',
    name: 'Test Group',
    description: 'A test group',
    createdBy: 'creator-id',
    createdAt: new Date(),
    updatedAt: new Date(),
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

  describe('canUserManageGroup', () => {
    it('should allow creator to manage group', () => {
      expect(GroupModel.canUserManageGroup('creator-id', mockGroup)).toBe(true);
    });

    it('should allow admin to manage group', () => {
      expect(GroupModel.canUserManageGroup('admin-id', mockGroup)).toBe(true);
    });

    it('should not allow regular member to manage group', () => {
      expect(GroupModel.canUserManageGroup('member-id', mockGroup)).toBe(false);
    });

    it('should not allow non-member to manage group', () => {
      expect(GroupModel.canUserManageGroup('non-member-id', mockGroup)).toBe(false);
    });
  });

  describe('canUserAddMembers', () => {
    it('should allow creator to add members', () => {
      expect(GroupModel.canUserAddMembers('creator-id', mockGroup)).toBe(true);
    });

    it('should allow admin to add members', () => {
      expect(GroupModel.canUserAddMembers('admin-id', mockGroup)).toBe(true);
    });

    it('should not allow regular member to add members', () => {
      expect(GroupModel.canUserAddMembers('member-id', mockGroup)).toBe(false);
    });
  });

  describe('canUserRemoveMembers', () => {
    it('should allow creator to remove members', () => {
      expect(GroupModel.canUserRemoveMembers('creator-id', mockGroup)).toBe(true);
    });

    it('should allow admin to remove members', () => {
      expect(GroupModel.canUserRemoveMembers('admin-id', mockGroup)).toBe(true);
    });

    it('should not allow regular member to remove members', () => {
      expect(GroupModel.canUserRemoveMembers('member-id', mockGroup)).toBe(false);
    });
  });

  describe('canUserLeaveGroup', () => {
    it('should not allow creator to leave group with other members', () => {
      expect(GroupModel.canUserLeaveGroup('creator-id', mockGroup)).toBe(false);
    });

    it('should allow creator to leave empty group', () => {
      const emptyGroup = { ...mockGroup, members: [] };
      expect(GroupModel.canUserLeaveGroup('creator-id', emptyGroup)).toBe(true);
    });

    it('should allow members to leave group', () => {
      expect(GroupModel.canUserLeaveGroup('admin-id', mockGroup)).toBe(true);
      expect(GroupModel.canUserLeaveGroup('member-id', mockGroup)).toBe(true);
    });

    it('should not allow non-member to leave group', () => {
      expect(GroupModel.canUserLeaveGroup('non-member-id', mockGroup)).toBe(false);
    });
  });

  describe('canUserDeleteGroup', () => {
    it('should allow creator to delete group', () => {
      expect(GroupModel.canUserDeleteGroup('creator-id', mockGroup)).toBe(true);
    });

    it('should not allow admin to delete group', () => {
      expect(GroupModel.canUserDeleteGroup('admin-id', mockGroup)).toBe(false);
    });

    it('should not allow member to delete group', () => {
      expect(GroupModel.canUserDeleteGroup('member-id', mockGroup)).toBe(false);
    });
  });

  describe('getUserRole', () => {
    it('should return creator for group creator', () => {
      expect(GroupModel.getUserRole('creator-id', mockGroup)).toBe('creator');
    });

    it('should return admin for admin member', () => {
      expect(GroupModel.getUserRole('admin-id', mockGroup)).toBe('admin');
    });

    it('should return member for regular member', () => {
      expect(GroupModel.getUserRole('member-id', mockGroup)).toBe('member');
    });

    it('should return null for non-member', () => {
      expect(GroupModel.getUserRole('non-member-id', mockGroup)).toBe(null);
    });
  });

  describe('isUserMember', () => {
    it('should return true for creator', () => {
      expect(GroupModel.isUserMember('creator-id', mockGroup)).toBe(true);
    });

    it('should return true for members', () => {
      expect(GroupModel.isUserMember('admin-id', mockGroup)).toBe(true);
      expect(GroupModel.isUserMember('member-id', mockGroup)).toBe(true);
    });

    it('should return false for non-member', () => {
      expect(GroupModel.isUserMember('non-member-id', mockGroup)).toBe(false);
    });
  });

  describe('getAdminMembers', () => {
    it('should return only admin members', () => {
      const admins = GroupModel.getAdminMembers(mockGroup);
      expect(admins).toHaveLength(1);
      expect(admins[0].userId).toBe('admin-id');
      expect(admins[0].role).toBe('admin');
    });
  });

  describe('getMemberCount', () => {
    it('should return total member count including creator', () => {
      expect(GroupModel.getMemberCount(mockGroup)).toBe(3); // 2 members + 1 creator
    });

    it('should return 1 for group with only creator', () => {
      const emptyGroup = { ...mockGroup, members: [] };
      expect(GroupModel.getMemberCount(emptyGroup)).toBe(1);
    });
  });
});