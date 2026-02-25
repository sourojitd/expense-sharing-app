/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getExpenses, POST as createExpense } from '../../app/api/expenses/route';
import { setAuthService } from '../../lib/middleware/auth.middleware';
import { SplitType } from '../../lib/models/expense';

// Mock AuthService
const mockAuthService = {
  verifyAccessToken: jest.fn(),
} as any;

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    expense: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    expenseSplit: {
      createMany: jest.fn(),
    },
    groupMember: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  })),
}));

describe('Expense API Basic Tests', () => {
  const mockUser = {
    userId: '550e8400-e29b-41d4-a716-446655440001',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setAuthService(mockAuthService);
    mockAuthService.verifyAccessToken.mockResolvedValue(mockUser);
  });

  describe('GET /api/expenses', () => {
    it('should return 401 without valid token', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        headers: { authorization: 'Bearer invalid-token' },
      });

      const response = await getExpenses(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });

    it('should handle missing authorization header', async () => {
      const request = new NextRequest('http://localhost:3000/api/expenses');

      const response = await getExpenses(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authorization header is required');
    });
  });

  describe('POST /api/expenses', () => {
    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        description: 'Test Expense',
        // Missing required fields
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(incompleteData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 401 without valid token', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      const expenseData = {
        description: 'Test Expense',
        amount: 100,
        currency: 'USD',
        date: '2024-01-01',
        paidBy: '550e8400-e29b-41d4-a716-446655440001',
        splitType: SplitType.EQUAL,
        participants: [
          { userId: '550e8400-e29b-41d4-a716-446655440001' },
        ],
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer invalid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const response = await createExpense(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });
  });

  describe('API Endpoint Structure', () => {
    it('should have proper endpoint functions exported', () => {
      expect(typeof getExpenses).toBe('function');
      expect(typeof createExpense).toBe('function');
    });
  });
});