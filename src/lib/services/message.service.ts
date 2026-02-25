import { PrismaClient } from '@prisma/client';
import { MessageRepository, MessageQueryOptions } from '../repositories/message.repository';
import { GroupRepository } from '../repositories/group.repository';

export class MessageService {
  private messageRepository: MessageRepository;
  private groupRepository: GroupRepository;

  constructor(private prisma: PrismaClient) {
    this.messageRepository = new MessageRepository(prisma);
    this.groupRepository = new GroupRepository(prisma);
  }

  /**
   * Get messages for a group (verifies user is a member)
   */
  async getMessages(groupId: string, userId: string, options?: MessageQueryOptions) {
    // Verify group exists
    const group = await this.groupRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Verify user is a member
    const isMember = await this.groupRepository.isUserMember(groupId, userId);
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this group');
    }

    const limit = options?.limit || 50;
    const messages = await this.messageRepository.getMessages(groupId, {
      ...options,
      limit: limit + 1, // Fetch one extra to determine if there are more
    });

    const hasMore = messages.length > limit;
    const trimmedMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? trimmedMessages[trimmedMessages.length - 1].id : undefined;

    return {
      messages: trimmedMessages,
      nextCursor,
    };
  }

  /**
   * Send a text message to a group
   */
  async sendMessage(groupId: string, userId: string, content: string) {
    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Message content is required');
    }

    // Verify group exists
    const group = await this.groupRepository.getGroupById(groupId);
    if (!group) {
      throw new Error('Group not found');
    }

    // Verify user is a member
    const isMember = await this.groupRepository.isUserMember(groupId, userId);
    if (!isMember) {
      throw new Error('Access denied: You are not a member of this group');
    }

    return await this.messageRepository.createMessage({
      groupId,
      userId,
      content: content.trim(),
      type: 'TEXT',
    });
  }

  /**
   * Send a system message to a group (no membership check required)
   */
  async sendSystemMessage(groupId: string, userId: string, content: string) {
    return await this.messageRepository.createMessage({
      groupId,
      userId,
      content,
      type: 'SYSTEM',
    });
  }
}
