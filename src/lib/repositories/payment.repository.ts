import { PrismaClient, Payment, PaymentStatus } from '@prisma/client';

export class PaymentRepository {
  constructor(private prisma: PrismaClient) {}

  async createPayment(data: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency: string;
    method: string;
    groupId?: string;
    note?: string;
  }): Promise<Payment> {
    return this.prisma.payment.create({
      data: {
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        amount: data.amount,
        currency: data.currency,
        method: data.method,
        groupId: data.groupId,
        note: data.note,
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true, profilePicture: true } },
        toUser: { select: { id: true, name: true, email: true, profilePicture: true } },
      },
    });
  }

  async getPaymentById(id: string): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        fromUser: { select: { id: true, name: true, email: true, profilePicture: true } },
        toUser: { select: { id: true, name: true, email: true, profilePicture: true } },
        group: { select: { id: true, name: true } },
      },
    });
  }

  async getPaymentsByUser(userId: string, filters?: {
    status?: PaymentStatus;
    groupId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]> {
    const where: Record<string, unknown> = {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
    };
    if (filters?.status) where.status = filters.status;
    if (filters?.groupId) where.groupId = filters.groupId;

    return this.prisma.payment.findMany({
      where,
      include: {
        fromUser: { select: { id: true, name: true, email: true, profilePicture: true } },
        toUser: { select: { id: true, name: true, email: true, profilePicture: true } },
        group: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  async updatePaymentStatus(id: string, status: PaymentStatus, confirmedAt?: Date): Promise<Payment> {
    return this.prisma.payment.update({
      where: { id },
      data: {
        status,
        ...(confirmedAt && { confirmedAt }),
        ...(status === 'COMPLETED' && { settledAt: new Date() }),
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true, profilePicture: true } },
        toUser: { select: { id: true, name: true, email: true, profilePicture: true } },
      },
    });
  }

  async getPaymentsBetweenUsers(userId1: string, userId2: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: {
        OR: [
          { fromUserId: userId1, toUserId: userId2 },
          { fromUserId: userId2, toUserId: userId1 },
        ],
      },
      include: {
        fromUser: { select: { id: true, name: true, email: true, profilePicture: true } },
        toUser: { select: { id: true, name: true, email: true, profilePicture: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getGroupPayments(groupId: string): Promise<Payment[]> {
    return this.prisma.payment.findMany({
      where: { groupId },
      include: {
        fromUser: { select: { id: true, name: true, email: true, profilePicture: true } },
        toUser: { select: { id: true, name: true, email: true, profilePicture: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
