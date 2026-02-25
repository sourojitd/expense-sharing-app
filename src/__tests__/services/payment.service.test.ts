import { PrismaClient, Payment } from '@prisma/client';
import { PaymentService } from '../../lib/services/payment.service';
import { PaymentRepository } from '../../lib/repositories/payment.repository';

// Mock the repository module
jest.mock('../../lib/repositories/payment.repository');

const MockPaymentRepository = PaymentRepository as jest.MockedClass<typeof PaymentRepository>;

// Mock Prisma Client
const mockPrisma = {
  payment: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  groupMember: {
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

describe('PaymentService', () => {
  let paymentService: PaymentService;
  let mockRepo: jest.Mocked<PaymentRepository>;

  const baseMockPayment: Payment = {
    id: 'pay-1',
    fromUserId: 'user-a',
    toUserId: 'user-b',
    amount: 50 as unknown as import('@prisma/client/runtime/library').Decimal,
    currency: 'USD',
    method: 'cash',
    status: 'PENDING',
    groupId: null,
    note: null,
    confirmedAt: null,
    createdAt: new Date('2024-06-01'),
    settledAt: null,
  };

  beforeEach(() => {
    // Reset mocks
    MockPaymentRepository.mockClear();
    jest.clearAllMocks();

    paymentService = new PaymentService(mockPrisma);

    // Get the mocked instance that was created inside PaymentService constructor
    mockRepo = MockPaymentRepository.mock.instances[0] as jest.Mocked<PaymentRepository>;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('recordPayment', () => {
    const validPaymentData = {
      fromUserId: 'user-a',
      toUserId: 'user-b',
      amount: 50,
      currency: 'USD',
      method: 'cash',
    };

    it('should successfully create a payment', async () => {
      mockRepo.createPayment.mockResolvedValue(baseMockPayment);

      const result = await paymentService.recordPayment(validPaymentData, 'user-a');

      expect(result).toEqual(baseMockPayment);
      expect(mockRepo.createPayment).toHaveBeenCalledWith(validPaymentData);
    });

    it('should reject if fromUserId !== requestingUserId', async () => {
      await expect(
        paymentService.recordPayment(validPaymentData, 'user-c')
      ).rejects.toThrow('You can only record payments from yourself');

      expect(mockRepo.createPayment).not.toHaveBeenCalled();
    });

    it('should reject self-payment', async () => {
      const selfPaymentData = {
        ...validPaymentData,
        toUserId: 'user-a',
      };

      await expect(
        paymentService.recordPayment(selfPaymentData, 'user-a')
      ).rejects.toThrow('Cannot make a payment to yourself');
    });

    it('should reject zero amount', async () => {
      const zeroAmountData = { ...validPaymentData, amount: 0 };

      await expect(
        paymentService.recordPayment(zeroAmountData, 'user-a')
      ).rejects.toThrow('Payment amount must be positive');
    });

    it('should reject negative amount', async () => {
      const negativeAmountData = { ...validPaymentData, amount: -10 };

      await expect(
        paymentService.recordPayment(negativeAmountData, 'user-a')
      ).rejects.toThrow('Payment amount must be positive');
    });

    it('should verify group membership if groupId is provided', async () => {
      const dataWithGroup = { ...validPaymentData, groupId: 'group-1' };

      (mockPrisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ groupId: 'group-1', userId: 'user-a' }) // fromUser member
        .mockResolvedValueOnce({ groupId: 'group-1', userId: 'user-b' }); // toUser member

      mockRepo.createPayment.mockResolvedValue({
        ...baseMockPayment,
        groupId: 'group-1',
      });

      const result = await paymentService.recordPayment(dataWithGroup, 'user-a');

      expect(result.groupId).toBe('group-1');
      expect(mockPrisma.groupMember.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should reject when fromUser is not a group member', async () => {
      const dataWithGroup = { ...validPaymentData, groupId: 'group-1' };

      (mockPrisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce(null) // fromUser not a member
        .mockResolvedValueOnce({ groupId: 'group-1', userId: 'user-b' });

      await expect(
        paymentService.recordPayment(dataWithGroup, 'user-a')
      ).rejects.toThrow('Both users must be members of the group');
    });

    it('should reject when toUser is not a group member', async () => {
      const dataWithGroup = { ...validPaymentData, groupId: 'group-1' };

      (mockPrisma.groupMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ groupId: 'group-1', userId: 'user-a' })
        .mockResolvedValueOnce(null); // toUser not a member

      await expect(
        paymentService.recordPayment(dataWithGroup, 'user-a')
      ).rejects.toThrow('Both users must be members of the group');
    });
  });

  describe('confirmPayment', () => {
    it('should allow only the recipient to confirm', async () => {
      const pendingPayment = { ...baseMockPayment, status: 'PENDING' as const };
      const completedPayment = { ...baseMockPayment, status: 'COMPLETED' as const, confirmedAt: new Date() };

      mockRepo.getPaymentById.mockResolvedValue(pendingPayment);
      mockRepo.updatePaymentStatus.mockResolvedValue(completedPayment);

      const result = await paymentService.confirmPayment('pay-1', 'user-b');

      expect(result.status).toBe('COMPLETED');
      expect(mockRepo.updatePaymentStatus).toHaveBeenCalledWith(
        'pay-1',
        'COMPLETED',
        expect.any(Date)
      );
    });

    it('should reject when non-recipient tries to confirm', async () => {
      const pendingPayment = { ...baseMockPayment, status: 'PENDING' as const };
      mockRepo.getPaymentById.mockResolvedValue(pendingPayment);

      await expect(
        paymentService.confirmPayment('pay-1', 'user-a')
      ).rejects.toThrow('Only the recipient can confirm a payment');
    });

    it('should reject if payment status is not PENDING', async () => {
      const completedPayment = { ...baseMockPayment, status: 'COMPLETED' as const };
      mockRepo.getPaymentById.mockResolvedValue(completedPayment);

      await expect(
        paymentService.confirmPayment('pay-1', 'user-b')
      ).rejects.toThrow('Payment cannot be confirmed - current status: COMPLETED');
    });

    it('should throw error when payment not found', async () => {
      mockRepo.getPaymentById.mockResolvedValue(null);

      await expect(
        paymentService.confirmPayment('non-existent', 'user-b')
      ).rejects.toThrow('Payment not found');
    });
  });

  describe('rejectPayment', () => {
    it('should allow only the recipient to reject', async () => {
      const pendingPayment = { ...baseMockPayment, status: 'PENDING' as const };
      const cancelledPayment = { ...baseMockPayment, status: 'CANCELLED' as const };

      mockRepo.getPaymentById.mockResolvedValue(pendingPayment);
      mockRepo.updatePaymentStatus.mockResolvedValue(cancelledPayment);

      const result = await paymentService.rejectPayment('pay-1', 'user-b');

      expect(result.status).toBe('CANCELLED');
      expect(mockRepo.updatePaymentStatus).toHaveBeenCalledWith('pay-1', 'CANCELLED');
    });

    it('should reject when non-recipient tries to reject', async () => {
      const pendingPayment = { ...baseMockPayment, status: 'PENDING' as const };
      mockRepo.getPaymentById.mockResolvedValue(pendingPayment);

      await expect(
        paymentService.rejectPayment('pay-1', 'user-a')
      ).rejects.toThrow('Only the recipient can reject a payment');
    });

    it('should reject if status is not PENDING', async () => {
      const completedPayment = { ...baseMockPayment, status: 'COMPLETED' as const };
      mockRepo.getPaymentById.mockResolvedValue(completedPayment);

      await expect(
        paymentService.rejectPayment('pay-1', 'user-b')
      ).rejects.toThrow('Payment cannot be rejected - current status: COMPLETED');
    });
  });

  describe('getPaymentById', () => {
    it('should return payment for an involved user (fromUser)', async () => {
      mockRepo.getPaymentById.mockResolvedValue(baseMockPayment);

      const result = await paymentService.getPaymentById('pay-1', 'user-a');

      expect(result).toEqual(baseMockPayment);
    });

    it('should return payment for an involved user (toUser)', async () => {
      mockRepo.getPaymentById.mockResolvedValue(baseMockPayment);

      const result = await paymentService.getPaymentById('pay-1', 'user-b');

      expect(result).toEqual(baseMockPayment);
    });

    it('should deny access for non-involved user', async () => {
      mockRepo.getPaymentById.mockResolvedValue(baseMockPayment);

      await expect(
        paymentService.getPaymentById('pay-1', 'user-c')
      ).rejects.toThrow('Access denied');
    });

    it('should throw when payment does not exist', async () => {
      mockRepo.getPaymentById.mockResolvedValue(null);

      await expect(
        paymentService.getPaymentById('non-existent', 'user-a')
      ).rejects.toThrow('Payment not found');
    });
  });
});
