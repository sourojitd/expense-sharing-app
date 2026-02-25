import { FriendService } from '../../lib/services/friend.service';
import { UserRepository } from '../../lib/repositories/user.repository';
import { FriendRepository } from '../../lib/repositories/friend.repository';
import { User, FriendRequest } from '@prisma/client';

// Mock the repositories
jest.mock('../../lib/repositories/user.repository');
jest.mock('../../lib/repositories/friend.repository');

describe('FriendService', () => {
  let friendService: FriendService;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockFriendRepository: jest.Mocked<FriendRepository>;

  const mockUser1: User = {
    id: 'user-1',
    email: 'user1@example.com',
    passwordHash: 'hashed-password',
    name: 'User One',
    phone: '+1234567890',
    profilePicture: null,
    preferredCurrency: 'USD',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockUser2: User = {
    id: 'user-2',
    email: 'user2@example.com',
    passwordHash: 'hashed-password',
    name: 'User Two',
    phone: '+9876543210',
    profilePicture: null,
    preferredCurrency: 'USD',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFriendRequest: FriendRequest = {
    id: 'request-1',
    senderId: 'user-1',
    receiverId: 'user-2',
    status: 'PENDING',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    mockFriendRepository = new FriendRepository() as jest.Mocked<FriendRepository>;
    friendService = new FriendService(mockUserRepository, mockFriendRepository);
    jest.clearAllMocks();
  });

  describe('sendFriendRequest', () => {
    it('should send friend request successfully', async () => {
      mockUserRepository.findUserById
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      mockFriendRepository.findFriendRequest.mockResolvedValue(null);
      mockFriendRepository.createFriendRequest.mockResolvedValue(mockFriendRequest);

      const result = await friendService.sendFriendRequest('user-1', 'user-2');

      expect(result).toEqual(mockFriendRequest);
      expect(mockFriendRepository.createFriendRequest).toHaveBeenCalledWith('user-1', 'user-2');
    });

    it('should throw error if sender not found', async () => {
      mockUserRepository.findUserById
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser2);

      await expect(
        friendService.sendFriendRequest('user-1', 'user-2')
      ).rejects.toThrow('Failed to send friend request: Sender not found');
    });

    it('should throw error if receiver not found', async () => {
      mockUserRepository.findUserById
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(null);

      await expect(
        friendService.sendFriendRequest('user-1', 'user-2')
      ).rejects.toThrow('Failed to send friend request: Receiver not found');
    });

    it('should throw error if trying to send request to self', async () => {
      mockUserRepository.findUserById
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser1);

      await expect(
        friendService.sendFriendRequest('user-1', 'user-1')
      ).rejects.toThrow('Failed to send friend request: Cannot send friend request to yourself');
    });

    it('should throw error if friend request already exists', async () => {
      mockUserRepository.findUserById
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      mockFriendRepository.findFriendRequest.mockResolvedValue(mockFriendRequest);

      await expect(
        friendService.sendFriendRequest('user-1', 'user-2')
      ).rejects.toThrow('Failed to send friend request: Friend request already sent');
    });

    it('should throw error if users are already friends', async () => {
      const acceptedRequest = { ...mockFriendRequest, status: 'ACCEPTED' as const };
      mockUserRepository.findUserById
        .mockResolvedValueOnce(mockUser1)
        .mockResolvedValueOnce(mockUser2);
      mockFriendRepository.findFriendRequest.mockResolvedValue(acceptedRequest);

      await expect(
        friendService.sendFriendRequest('user-1', 'user-2')
      ).rejects.toThrow('Failed to send friend request: Users are already friends');
    });
  });

  describe('acceptFriendRequest', () => {
    it('should accept friend request successfully', async () => {
      const acceptedRequest = { ...mockFriendRequest, status: 'ACCEPTED' as const };
      mockFriendRepository.findFriendRequestById.mockResolvedValue(mockFriendRequest);
      mockFriendRepository.updateFriendRequestStatus.mockResolvedValue(acceptedRequest);

      const result = await friendService.acceptFriendRequest('request-1', 'user-2');

      expect(result).toEqual(acceptedRequest);
      expect(mockFriendRepository.updateFriendRequestStatus).toHaveBeenCalledWith('request-1', 'ACCEPTED');
    });

    it('should throw error if friend request not found', async () => {
      mockFriendRepository.findFriendRequestById.mockResolvedValue(null);

      await expect(
        friendService.acceptFriendRequest('request-1', 'user-2')
      ).rejects.toThrow('Failed to accept friend request: Friend request not found');
    });

    it('should throw error if user is not the receiver', async () => {
      mockFriendRepository.findFriendRequestById.mockResolvedValue(mockFriendRequest);

      await expect(
        friendService.acceptFriendRequest('request-1', 'user-1')
      ).rejects.toThrow('Failed to accept friend request: You can only accept friend requests sent to you');
    });

    it('should throw error if request is not pending', async () => {
      const acceptedRequest = { ...mockFriendRequest, status: 'ACCEPTED' as const };
      mockFriendRepository.findFriendRequestById.mockResolvedValue(acceptedRequest);

      await expect(
        friendService.acceptFriendRequest('request-1', 'user-2')
      ).rejects.toThrow('Failed to accept friend request: Friend request is no longer pending');
    });
  });

  describe('rejectFriendRequest', () => {
    it('should reject friend request successfully', async () => {
      const rejectedRequest = { ...mockFriendRequest, status: 'REJECTED' as const };
      mockFriendRepository.findFriendRequestById.mockResolvedValue(mockFriendRequest);
      mockFriendRepository.updateFriendRequestStatus.mockResolvedValue(rejectedRequest);

      const result = await friendService.rejectFriendRequest('request-1', 'user-2');

      expect(result).toEqual(rejectedRequest);
      expect(mockFriendRepository.updateFriendRequestStatus).toHaveBeenCalledWith('request-1', 'REJECTED');
    });
  });

  describe('cancelFriendRequest', () => {
    it('should cancel friend request successfully', async () => {
      mockFriendRepository.findFriendRequestById.mockResolvedValue(mockFriendRequest);
      mockFriendRepository.deleteFriendRequest.mockResolvedValue();

      await friendService.cancelFriendRequest('request-1', 'user-1');

      expect(mockFriendRepository.deleteFriendRequest).toHaveBeenCalledWith('request-1');
    });

    it('should throw error if user is not the sender', async () => {
      mockFriendRepository.findFriendRequestById.mockResolvedValue(mockFriendRequest);

      await expect(
        friendService.cancelFriendRequest('request-1', 'user-2')
      ).rejects.toThrow('Failed to cancel friend request: You can only cancel friend requests you sent');
    });
  });

  describe('removeFriend', () => {
    it('should remove friend successfully', async () => {
      const acceptedRequest = { ...mockFriendRequest, status: 'ACCEPTED' as const };
      mockFriendRepository.findAcceptedFriendRequest.mockResolvedValue(acceptedRequest);
      mockFriendRepository.deleteFriendRequest.mockResolvedValue();

      await friendService.removeFriend('user-1', 'user-2');

      expect(mockFriendRepository.deleteFriendRequest).toHaveBeenCalledWith('request-1');
    });

    it('should throw error if no friendship exists', async () => {
      mockFriendRepository.findAcceptedFriendRequest.mockResolvedValue(null);

      await expect(
        friendService.removeFriend('user-1', 'user-2')
      ).rejects.toThrow('Failed to remove friend: No friendship found between these users');
    });
  });

  describe('getFriends', () => {
    it('should return list of friends', async () => {
      const friends = [mockUser2];
      mockFriendRepository.getFriends.mockResolvedValue(friends);

      const result = await friendService.getFriends('user-1');

      expect(result).toEqual(friends);
      expect(mockFriendRepository.getFriends).toHaveBeenCalledWith('user-1');
    });
  });

  describe('searchUsersWithFriendshipStatus', () => {
    it('should return users with friendship status', async () => {
      const searchResults = [mockUser2];
      mockUserRepository.searchUsers.mockResolvedValue(searchResults);
      mockFriendRepository.findAcceptedFriendRequest.mockResolvedValue(null);
      mockFriendRepository.findFriendRequest.mockResolvedValue(null);

      const result = await friendService.searchUsersWithFriendshipStatus('user-1', 'User Two');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        ...mockUser2,
        friendshipStatus: 'none'
      });
    });
  });

  describe('getFriendshipStatus', () => {
    it('should return "friend" status for accepted friendship', async () => {
      const acceptedRequest = { ...mockFriendRequest, status: 'ACCEPTED' as const };
      mockFriendRepository.findAcceptedFriendRequest.mockResolvedValue(acceptedRequest);

      const result = await friendService.getFriendshipStatus('user-1', 'user-2');

      expect(result).toEqual({
        status: 'friend',
        requestId: 'request-1'
      });
    });

    it('should return "pending_sent" status for sent request', async () => {
      mockFriendRepository.findAcceptedFriendRequest.mockResolvedValue(null);
      mockFriendRepository.findFriendRequest
        .mockResolvedValueOnce(mockFriendRequest)
        .mockResolvedValueOnce(null);

      const result = await friendService.getFriendshipStatus('user-1', 'user-2');

      expect(result).toEqual({
        status: 'pending_sent',
        requestId: 'request-1'
      });
    });

    it('should return "pending_received" status for received request', async () => {
      mockFriendRepository.findAcceptedFriendRequest.mockResolvedValue(null);
      mockFriendRepository.findFriendRequest
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockFriendRequest);

      const result = await friendService.getFriendshipStatus('user-1', 'user-2');

      expect(result).toEqual({
        status: 'pending_received',
        requestId: 'request-1'
      });
    });

    it('should return "none" status when no relationship exists', async () => {
      mockFriendRepository.findAcceptedFriendRequest.mockResolvedValue(null);
      mockFriendRepository.findFriendRequest.mockResolvedValue(null);

      const result = await friendService.getFriendshipStatus('user-1', 'user-2');

      expect(result).toEqual({
        status: 'none'
      });
    });
  });

  describe('areFriends', () => {
    it('should return true if users are friends', async () => {
      const acceptedRequest = { ...mockFriendRequest, status: 'ACCEPTED' as const };
      mockFriendRepository.findAcceptedFriendRequest.mockResolvedValue(acceptedRequest);

      const result = await friendService.areFriends('user-1', 'user-2');

      expect(result).toBe(true);
    });

    it('should return false if users are not friends', async () => {
      mockFriendRepository.findAcceptedFriendRequest.mockResolvedValue(null);
      mockFriendRepository.findFriendRequest.mockResolvedValue(null);

      const result = await friendService.areFriends('user-1', 'user-2');

      expect(result).toBe(false);
    });
  });

  describe('getFriendCount', () => {
    it('should return friend count', async () => {
      mockFriendRepository.getFriendCount.mockResolvedValue(5);

      const result = await friendService.getFriendCount('user-1');

      expect(result).toBe(5);
      expect(mockFriendRepository.getFriendCount).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getMutualFriends', () => {
    it('should return mutual friends', async () => {
      const mutualFriends = [mockUser2];
      mockFriendRepository.getMutualFriends.mockResolvedValue(mutualFriends);

      const result = await friendService.getMutualFriends('user-1', 'user-3');

      expect(result).toEqual(mutualFriends);
      expect(mockFriendRepository.getMutualFriends).toHaveBeenCalledWith('user-1', 'user-3');
    });
  });
});