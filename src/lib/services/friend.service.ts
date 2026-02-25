import { UserRepository } from '../repositories/user.repository';
import { FriendRepository } from '../repositories/friend.repository';
import { User, FriendRequest } from '@prisma/client';

export interface FriendWithStatus extends User {
  friendshipStatus: 'friend' | 'pending_sent' | 'pending_received' | 'none';
  friendRequestId?: string;
}

export interface FriendRequestWithUsers extends FriendRequest {
  sender: User;
  receiver: User;
}

export class FriendService {
  private userRepository: UserRepository;
  private friendRepository: FriendRepository;

  constructor(userRepository?: UserRepository, friendRepository?: FriendRepository) {
    this.userRepository = userRepository || new UserRepository();
    this.friendRepository = friendRepository || new FriendRepository();
  }

  async sendFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest> {
    try {
      // Validate that users exist
      const [sender, receiver] = await Promise.all([
        this.userRepository.findUserById(senderId),
        this.userRepository.findUserById(receiverId)
      ]);

      if (!sender) {
        throw new Error('Sender not found');
      }

      if (!receiver) {
        throw new Error('Receiver not found');
      }

      if (senderId === receiverId) {
        throw new Error('Cannot send friend request to yourself');
      }

      // Check if there's already a friend request between these users
      const existingRequest = await this.friendRepository.findFriendRequest(senderId, receiverId);
      if (existingRequest) {
        if (existingRequest.status === 'PENDING') {
          throw new Error('Friend request already sent');
        }
        if (existingRequest.status === 'ACCEPTED') {
          throw new Error('Users are already friends');
        }
      }

      // Check for reverse friend request
      const reverseRequest = await this.friendRepository.findFriendRequest(receiverId, senderId);
      if (reverseRequest && reverseRequest.status === 'PENDING') {
        throw new Error('This user has already sent you a friend request');
      }

      return await this.friendRepository.createFriendRequest(senderId, receiverId);
    } catch (error) {
      throw new Error(`Failed to send friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async acceptFriendRequest(requestId: string, userId: string): Promise<FriendRequest> {
    try {
      const friendRequest = await this.friendRepository.findFriendRequestById(requestId);
      
      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      if (friendRequest.receiverId !== userId) {
        throw new Error('You can only accept friend requests sent to you');
      }

      if (friendRequest.status !== 'PENDING') {
        throw new Error('Friend request is no longer pending');
      }

      return await this.friendRepository.updateFriendRequestStatus(requestId, 'ACCEPTED');
    } catch (error) {
      throw new Error(`Failed to accept friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async rejectFriendRequest(requestId: string, userId: string): Promise<FriendRequest> {
    try {
      const friendRequest = await this.friendRepository.findFriendRequestById(requestId);
      
      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      if (friendRequest.receiverId !== userId) {
        throw new Error('You can only reject friend requests sent to you');
      }

      if (friendRequest.status !== 'PENDING') {
        throw new Error('Friend request is no longer pending');
      }

      return await this.friendRepository.updateFriendRequestStatus(requestId, 'REJECTED');
    } catch (error) {
      throw new Error(`Failed to reject friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async cancelFriendRequest(requestId: string, userId: string): Promise<void> {
    try {
      const friendRequest = await this.friendRepository.findFriendRequestById(requestId);
      
      if (!friendRequest) {
        throw new Error('Friend request not found');
      }

      if (friendRequest.senderId !== userId) {
        throw new Error('You can only cancel friend requests you sent');
      }

      if (friendRequest.status !== 'PENDING') {
        throw new Error('Friend request is no longer pending');
      }

      await this.friendRepository.deleteFriendRequest(requestId);
    } catch (error) {
      throw new Error(`Failed to cancel friend request: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removeFriend(userId: string, friendId: string): Promise<void> {
    try {
      // Find the accepted friend request between these users
      const friendRequest = await this.friendRepository.findAcceptedFriendRequest(userId, friendId);
      
      if (!friendRequest) {
        throw new Error('No friendship found between these users');
      }

      await this.friendRepository.deleteFriendRequest(friendRequest.id);
    } catch (error) {
      throw new Error(`Failed to remove friend: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFriends(userId: string): Promise<User[]> {
    try {
      return await this.friendRepository.getFriends(userId);
    } catch (error) {
      throw new Error(`Failed to get friends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPendingFriendRequests(userId: string): Promise<FriendRequestWithUsers[]> {
    try {
      return await this.friendRepository.getPendingFriendRequests(userId);
    } catch (error) {
      throw new Error(`Failed to get pending friend requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSentFriendRequests(userId: string): Promise<FriendRequestWithUsers[]> {
    try {
      return await this.friendRepository.getSentFriendRequests(userId);
    } catch (error) {
      throw new Error(`Failed to get sent friend requests: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchUsersWithFriendshipStatus(userId: string, query: string): Promise<FriendWithStatus[]> {
    try {
      // Search for users excluding the current user
      const users = await this.userRepository.searchUsers(query, [userId]);
      
      // Get friendship status for each user
      const usersWithStatus: FriendWithStatus[] = [];
      
      for (const user of users) {
        const friendshipStatus = await this.getFriendshipStatus(userId, user.id);
        usersWithStatus.push({
          ...user,
          friendshipStatus: friendshipStatus.status,
          friendRequestId: friendshipStatus.requestId
        });
      }

      return usersWithStatus;
    } catch (error) {
      throw new Error(`Failed to search users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFriendshipStatus(userId: string, otherUserId: string): Promise<{
    status: 'friend' | 'pending_sent' | 'pending_received' | 'none';
    requestId?: string;
  }> {
    try {
      // Check for accepted friendship
      const acceptedRequest = await this.friendRepository.findAcceptedFriendRequest(userId, otherUserId);
      if (acceptedRequest) {
        return { status: 'friend', requestId: acceptedRequest.id };
      }

      // Check for pending request sent by current user
      const sentRequest = await this.friendRepository.findFriendRequest(userId, otherUserId);
      if (sentRequest && sentRequest.status === 'PENDING') {
        return { status: 'pending_sent', requestId: sentRequest.id };
      }

      // Check for pending request received by current user
      const receivedRequest = await this.friendRepository.findFriendRequest(otherUserId, userId);
      if (receivedRequest && receivedRequest.status === 'PENDING') {
        return { status: 'pending_received', requestId: receivedRequest.id };
      }

      return { status: 'none' };
    } catch (error) {
      throw new Error(`Failed to get friendship status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFriendCount(userId: string): Promise<number> {
    try {
      return await this.friendRepository.getFriendCount(userId);
    } catch (error) {
      throw new Error(`Failed to get friend count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async areFriends(userId: string, otherUserId: string): Promise<boolean> {
    try {
      const status = await this.getFriendshipStatus(userId, otherUserId);
      return status.status === 'friend';
    } catch {
      return false;
    }
  }

  async getMutualFriends(userId: string, otherUserId: string): Promise<User[]> {
    try {
      return await this.friendRepository.getMutualFriends(userId, otherUserId);
    } catch (error) {
      throw new Error(`Failed to get mutual friends: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}