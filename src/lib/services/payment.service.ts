import { PrismaClient, Payment, PaymentStatus } from '@prisma/client';
import { PaymentRepository } from '../repositories/payment.repository';

export class PaymentService {
  private paymentRepository: PaymentRepository;

  constructor(private prisma: PrismaClient) {
    this.paymentRepository = new PaymentRepository(prisma);
  }

  async recordPayment(data: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency: string;
    method: string;
    groupId?: string;
    note?: string;
  }, requestingUserId: string): Promise<Payment> {
    // Validate: the requesting user must be the fromUser
    if (data.fromUserId !== requestingUserId) {
      throw new Error('You can only record payments from yourself');
    }

    if (data.fromUserId === data.toUserId) {
      throw new Error('Cannot make a payment to yourself');
    }

    if (data.amount <= 0) {
      throw new Error('Payment amount must be positive');
    }

    // If groupId provided, verify both users are members
    if (data.groupId) {
      const fromMember = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: data.groupId, userId: data.fromUserId } },
      });
      const toMember = await this.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: data.groupId, userId: data.toUserId } },
      });
      if (!fromMember || !toMember) {
        throw new Error('Both users must be members of the group');
      }
    }

    return this.paymentRepository.createPayment(data);
  }

  async confirmPayment(paymentId: string, requestingUserId: string): Promise<Payment> {
    const payment = await this.paymentRepository.getPaymentById(paymentId);
    if (!payment) throw new Error('Payment not found');

    // Only the recipient can confirm a payment
    if (payment.toUserId !== requestingUserId) {
      throw new Error('Only the recipient can confirm a payment');
    }

    if (payment.status !== 'PENDING') {
      throw new Error(`Payment cannot be confirmed - current status: ${payment.status}`);
    }

    return this.paymentRepository.updatePaymentStatus(paymentId, 'COMPLETED', new Date());
  }

  async rejectPayment(paymentId: string, requestingUserId: string): Promise<Payment> {
    const payment = await this.paymentRepository.getPaymentById(paymentId);
    if (!payment) throw new Error('Payment not found');

    // Only the recipient can reject a payment
    if (payment.toUserId !== requestingUserId) {
      throw new Error('Only the recipient can reject a payment');
    }

    if (payment.status !== 'PENDING') {
      throw new Error(`Payment cannot be rejected - current status: ${payment.status}`);
    }

    return this.paymentRepository.updatePaymentStatus(paymentId, 'CANCELLED');
  }

  async getPayments(userId: string, filters?: {
    status?: PaymentStatus;
    groupId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Payment[]> {
    return this.paymentRepository.getPaymentsByUser(userId, filters);
  }

  async getPaymentById(paymentId: string, requestingUserId: string): Promise<Payment> {
    const payment = await this.paymentRepository.getPaymentById(paymentId);
    if (!payment) throw new Error('Payment not found');

    // Only involved users can view the payment
    if (payment.fromUserId !== requestingUserId && payment.toUserId !== requestingUserId) {
      throw new Error('Access denied');
    }

    return payment;
  }
}
