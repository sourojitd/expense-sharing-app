import { PrismaClient, FriendRequest, FriendRequestStatus, User, Prisma } from '@prisma/client';
import { prisma } from '../prisma';

export interface FriendRequestWithUsers extends FriendRequest {
  sender: User;
  receiver: User;
}

export class FriendRepository {
  private db: PrismaClient;

  constructor(dbClient?: PrismaClient) {
    this.db = dbClient || prisma;
  }

  async createFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest> {
    try {
      return await this.db.friendRequest.create({
        data: {
          senderId,
          receiverId,
          status: 'PENDING',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error('Friend request already exists');
      }
      throw error;
    }
  }

  async findFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest | null> {
    return this.db.friendRequest.findUnique({
      where: {
        senderId_receiverId: {
          senderId,
          receiverId,
        },
      },
    });
  }

  async findFriendRequestById(id: string): Promise<FriendRequest | null> {
    return this.db.friendRequest.findUnique({
      where: { id },
    });
  }

  async findAcceptedFriendRequest(userId: string, otherUserId: string): Promise<FriendRequest | null> {
    return this.db.friendRequest.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId },
        ],
      },
    });
  }

  async updateFriendRequestStatus(id: string, status: FriendRequestStatus): Promise<FriendRequest> {
    try {
      return await this.db.friendRequest.update({
        where: { id },
        data: { status },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Friend request not found');
      }
      throw error;
    }
  }

  async deleteFriendRequest(id: string): Promise<void> {
    try {
      await this.db.friendRequest.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new Error('Friend request not found');
      }
      throw error;
    }
  }

  async getFriends(userId: string): Promise<User[]> {
    const friendRequests = await this.db.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            phone: true,
            preferredCurrency: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: false,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            phone: true,
            preferredCurrency: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: false,
          },
        },
      },
    });

    // Extract the friend (the other user in each friendship)
    return friendRequests.map(request => 
      request.senderId === userId ? request.receiver : request.sender
    ) as User[];
  }

  async getPendingFriendRequests(userId: string): Promise<FriendRequestWithUsers[]> {
    return this.db.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            phone: true,
            preferredCurrency: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: false,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            phone: true,
            preferredCurrency: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: false,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as Promise<FriendRequestWithUsers[]>;
  }

  async getSentFriendRequests(userId: string): Promise<FriendRequestWithUsers[]> {
    return this.db.friendRequest.findMany({
      where: {
        senderId: userId,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            phone: true,
            preferredCurrency: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: false,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            phone: true,
            preferredCurrency: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: false,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as Promise<FriendRequestWithUsers[]>;
  }

  async getFriendCount(userId: string): Promise<number> {
    return this.db.friendRequest.count({
      where: {
        status: 'ACCEPTED',
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
    });
  }

  async getMutualFriends(userId: string, otherUserId: string): Promise<User[]> {
    // Get friends of both users
    const [userFriends, otherUserFriends] = await Promise.all([
      this.getFriends(userId),
      this.getFriends(otherUserId),
    ]);

    // Find mutual friends
    const mutualFriends = userFriends.filter(friend =>
      otherUserFriends.some(otherFriend => otherFriend.id === friend.id)
    );

    return mutualFriends;
  }

  async getFriendRequestsCount(userId: string): Promise<{
    received: number;
    sent: number;
  }> {
    const [received, sent] = await Promise.all([
      this.db.friendRequest.count({
        where: {
          receiverId: userId,
          status: 'PENDING',
        },
      }),
      this.db.friendRequest.count({
        where: {
          senderId: userId,
          status: 'PENDING',
        },
      }),
    ]);

    return { received, sent };
  }

  async getRecentFriendActivity(userId: string, limit: number = 10): Promise<FriendRequestWithUsers[]> {
    return this.db.friendRequest.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
        status: {
          in: ['ACCEPTED', 'REJECTED'],
        },
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            phone: true,
            preferredCurrency: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: false,
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
            phone: true,
            preferredCurrency: true,
            emailVerified: true,
            createdAt: true,
            updatedAt: true,
            passwordHash: false,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      take: limit,
    }) as Promise<FriendRequestWithUsers[]>;
  }
}