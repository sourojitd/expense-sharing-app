import { PrismaClient } from '@prisma/client';
import { GroupRepository } from '../repositories/group.repository';
import { 
  Group, 
  GroupMember, 
  GroupWithMembers, 
  GroupSummary,
  CreateGroupData,
  UpdateGroupData,
  AddGroupMemberData,
  UpdateGroupMemberData,
  GroupValidator,
  GroupModel
} from '../models/group';

export class GroupService {
  private groupRepository: GroupRepository;

  constructor(private prisma: PrismaClient) {
    this.groupRepository = new GroupRepository(prisma);
  }

  async createGroup(data: CreateGroupData, createdBy: string): Promise<Group> {
    // Validate input data
    const validatedData = GroupValidator.validateCreateGroup(data);

    // Create the group
    const group = await this.groupRepository.createGroup({
      ...validatedData,
      createdBy,
    });

    return group;
  }

  async getGroupById(id: string): Promise<Group | null> {
    return await this.groupRepository.getGroupById(id);
  }

  async getGroupWithMembers(id: string): Promise<GroupWithMembers | null> {
    return await this.groupRepository.getGroupWithMembers(id);
  }

  async updateGroup(id: string, data: UpdateGroupData, userId: string): Promise<Group> {
    // Validate input data
    const validatedData = GroupValidator.validateUpdateGroup(data);

    // Get group with members to check permissions
    const group = await this.groupRepository.getGroupWithMembers(id);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user can manage the group
    if (!GroupModel.canUserManageGroup(userId, group)) {
      throw new Error('Insufficient permissions to update group');
    }

    // Update the group
    return await this.groupRepository.updateGroup(id, validatedData);
  }

  async deleteGroup(id: string, userId: string): Promise<void> {
    // Get group with members to check permissions
    const group = await this.groupRepository.getGroupWithMembers(id);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user can delete the group (only creator)
    if (!GroupModel.canUserDeleteGroup(userId, group)) {
      throw new Error('Only group creator can delete the group');
    }

    // TODO: Check if there are unsettled expenses
    // For now, we'll allow deletion

    await this.groupRepository.deleteGroup(id);
  }

  async getUserGroups(userId: string): Promise<GroupSummary[]> {
    return await this.groupRepository.getUserGroups(userId);
  }

  async addGroupMember(groupId: string, memberData: AddGroupMemberData, userId: string): Promise<GroupMember> {
    // Validate input data
    const validatedData = GroupValidator.validateAddMember(memberData);

    // Get group with members to check permissions
    const group = await this.groupRepository.getGroupWithMembers(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user can add members
    if (!GroupModel.canUserAddMembers(userId, group)) {
      throw new Error('Insufficient permissions to add members');
    }

    // Check if user is already a member
    const isAlreadyMember = await this.groupRepository.isUserMember(groupId, validatedData.userId);
    if (isAlreadyMember) {
      throw new Error('User is already a member of this group');
    }

    // Add the member
    return await this.groupRepository.addGroupMember(groupId, validatedData);
  }

  async updateGroupMember(groupId: string, memberId: string, memberData: UpdateGroupMemberData, userId: string): Promise<GroupMember> {
    // Validate input data
    const validatedData = GroupValidator.validateUpdateMember(memberData);

    // Get group with members to check permissions
    const group = await this.groupRepository.getGroupWithMembers(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user can manage members
    if (!GroupModel.canUserManageGroup(userId, group)) {
      throw new Error('Insufficient permissions to update member');
    }

    // Check if member exists
    const member = await this.groupRepository.getGroupMember(groupId, memberId);
    if (!member) {
      throw new Error('Member not found in group');
    }

    // Update the member
    return await this.groupRepository.updateGroupMember(groupId, memberId, validatedData);
  }

  async removeGroupMember(groupId: string, memberId: string, userId: string): Promise<void> {
    // Get group with members to check permissions
    const group = await this.groupRepository.getGroupWithMembers(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user can remove members
    if (!GroupModel.canUserRemoveMembers(userId, group)) {
      throw new Error('Insufficient permissions to remove members');
    }

    // Check if member exists
    const member = await this.groupRepository.getGroupMember(groupId, memberId);
    if (!member) {
      throw new Error('Member not found in group');
    }

    // Cannot remove the creator
    if (memberId === group.createdBy) {
      throw new Error('Cannot remove group creator');
    }

    // TODO: Check if member has unsettled expenses
    // For now, we'll allow removal

    await this.groupRepository.removeGroupMember(groupId, memberId);
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    // Get group with members to check permissions
    const group = await this.groupRepository.getGroupWithMembers(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Check if user can leave the group
    if (!GroupModel.canUserLeaveGroup(userId, group)) {
      throw new Error('Cannot leave group. Creator must transfer ownership or delete group if no other members.');
    }

    // Check if user is actually a member
    if (!GroupModel.isUserMember(userId, group)) {
      throw new Error('User is not a member of this group');
    }

    // TODO: Check if user has unsettled expenses
    // For now, we'll allow leaving

    // If user is creator and no other members, delete the group
    if (group.createdBy === userId && group.members.length === 0) {
      await this.groupRepository.deleteGroup(groupId);
    } else {
      // Remove user from members
      await this.groupRepository.removeGroupMember(groupId, userId);
    }
  }

  async getGroupMembers(groupId: string, userId: string): Promise<GroupMember[]> {
    // Check if user is a member of the group
    const isUserMember = await this.groupRepository.isUserMember(groupId, userId);
    if (!isUserMember) {
      throw new Error('Access denied. User is not a member of this group');
    }

    return await this.groupRepository.getGroupMembers(groupId);
  }

  async searchGroups(query: string, userId: string): Promise<GroupSummary[]> {
    if (!query.trim()) {
      return [];
    }

    return await this.groupRepository.searchGroups(query, userId);
  }

  async isUserMember(groupId: string, userId: string): Promise<boolean> {
    return await this.groupRepository.isUserMember(groupId, userId);
  }

  async getUserRole(groupId: string, userId: string): Promise<string | null> {
    const group = await this.groupRepository.getGroupWithMembers(groupId);
    if (!group) {
      return null;
    }

    return GroupModel.getUserRole(userId, group);
  }

  async transferOwnership(groupId: string, newOwnerId: string, currentUserId: string): Promise<void> {
    // Get group with members
    const group = await this.groupRepository.getGroupWithMembers(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Only current creator can transfer ownership
    if (group.createdBy !== currentUserId) {
      throw new Error('Only group creator can transfer ownership');
    }

    // New owner must be a member
    const newOwnerMember = await this.groupRepository.getGroupMember(groupId, newOwnerId);
    if (!newOwnerMember) {
      throw new Error('New owner must be a member of the group');
    }

    // Use transaction to ensure consistency
    await this.prisma.$transaction(async (tx) => {
      // Update group creator
      await tx.group.update({
        where: { id: groupId },
        data: { createdBy: newOwnerId },
      });

      // Remove new owner from members list
      await tx.groupMember.delete({
        where: {
          groupId_userId: {
            groupId,
            userId: newOwnerId,
          },
        },
      });

      // Add previous creator as admin member
      await tx.groupMember.create({
        data: {
          groupId,
          userId: currentUserId,
          role: 'admin',
        },
      });
    });
  }
}