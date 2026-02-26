import { z } from 'zod';

export enum GroupType {
  HOME = 'HOME',
  TRIP = 'TRIP',
  COUPLE = 'COUPLE',
  BUSINESS = 'BUSINESS',
  FRIENDS = 'FRIENDS',
  OTHER = 'OTHER',
}

// Validation schemas
export const CreateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  image: z.string().url('Invalid image URL').optional(),
  type: z.nativeEnum(GroupType).default(GroupType.FRIENDS),
});

export const UpdateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  image: z.string().url('Invalid image URL').optional(),
  type: z.nativeEnum(GroupType).optional(),
});

export const GroupMemberRoleSchema = z.enum(['member', 'admin']);

export const AddGroupMemberSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: GroupMemberRoleSchema.default('member'),
});

export const UpdateGroupMemberSchema = z.object({
  role: GroupMemberRoleSchema,
});

// Types
export type CreateGroupData = z.infer<typeof CreateGroupSchema>;
export type UpdateGroupData = z.infer<typeof UpdateGroupSchema>;
export type GroupMemberRole = z.infer<typeof GroupMemberRoleSchema>;
export type AddGroupMemberData = z.infer<typeof AddGroupMemberSchema>;
export type UpdateGroupMemberData = z.infer<typeof UpdateGroupMemberSchema>;

export interface Group {
  id: string;
  name: string;
  description?: string;
  image?: string;
  type: GroupType;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: GroupMemberRole;
  joinedAt: Date;
}

export interface GroupWithMembers extends Group {
  members: (GroupMember & {
    user: {
      id: string;
      name: string;
      email: string;
      profilePicture?: string;
    };
  })[];
  creator: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
}

export interface GroupSummary {
  id: string;
  name: string;
  image?: string;
  type: GroupType;
  memberCount: number;
  totalExpenses: number;
  yourBalance: number;
}

// Group validation functions
export class GroupValidator {
  static validateCreateGroup(data: unknown): CreateGroupData {
    return CreateGroupSchema.parse(data);
  }

  static validateUpdateGroup(data: unknown): UpdateGroupData {
    return UpdateGroupSchema.parse(data);
  }

  static validateAddMember(data: unknown): AddGroupMemberData {
    return AddGroupMemberSchema.parse(data);
  }

  static validateUpdateMember(data: unknown): UpdateGroupMemberData {
    return UpdateGroupMemberSchema.parse(data);
  }

  static validateGroupName(name: string): boolean {
    try {
      z.string().min(1).max(100).parse(name);
      return true;
    } catch {
      return false;
    }
  }

  static validateMemberRole(role: string): boolean {
    try {
      GroupMemberRoleSchema.parse(role);
      return true;
    } catch {
      return false;
    }
  }
}

// Group business logic
export class GroupModel {
  static canUserManageGroup(userId: string, group: GroupWithMembers): boolean {
    // Creator can always manage
    if (group.createdBy === userId) {
      return true;
    }

    // Admin members can manage
    const member = group.members.find(m => m.userId === userId);
    return member?.role === 'admin';
  }

  static canUserAddMembers(userId: string, group: GroupWithMembers): boolean {
    return this.canUserManageGroup(userId, group);
  }

  static canUserRemoveMembers(userId: string, group: GroupWithMembers): boolean {
    return this.canUserManageGroup(userId, group);
  }

  static canUserLeaveGroup(userId: string, group: GroupWithMembers): boolean {
    // Creator cannot leave if there are other members
    if (group.createdBy === userId && group.members.length > 0) {
      return false;
    }
    
    // Creator can leave if no other members (empty group)
    if (group.createdBy === userId) {
      return true;
    }
    
    // Other members can always leave
    return group.members.some(m => m.userId === userId);
  }

  static canUserDeleteGroup(userId: string, group: GroupWithMembers): boolean {
    // Only creator can delete group
    return group.createdBy === userId;
  }

  static getUserRole(userId: string, group: GroupWithMembers): GroupMemberRole | 'creator' | null {
    if (group.createdBy === userId) {
      return 'creator';
    }

    const member = group.members.find(m => m.userId === userId);
    return member?.role || null;
  }

  static isUserMember(userId: string, group: GroupWithMembers): boolean {
    return group.createdBy === userId || group.members.some(m => m.userId === userId);
  }

  static getAdminMembers(group: GroupWithMembers): GroupMember[] {
    return group.members.filter(m => m.role === 'admin');
  }

  static getMemberCount(group: GroupWithMembers): number {
    return group.members.length + 1; // +1 for creator
  }
}