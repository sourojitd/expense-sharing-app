import { authMiddleware, optionalAuthMiddleware, setAuthService } from '../../lib/middleware/auth.middleware';
import { AuthService } from '../../lib/services/auth.service';

// Mock the headers.get method
const createMockRequest = (headers?: Record<string, string>) => {
  return {
    headers: {
      get: (name: string) => {
        if (!headers) return null;
        return headers[name] || headers[name.toLowerCase()] || null;
      }
    }
  } as any;
};

// Mock the AuthService
jest.mock('../../lib/services/auth.service');
const MockAuthService = AuthService as jest.MockedClass<typeof AuthService>;

// Mock console.error to avoid noise in tests
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Auth Middleware', () => {
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockAuthService = new MockAuthService() as jest.Mocked<AuthService>;
    MockAuthService.mockImplementation(() => mockAuthService);
    setAuthService(mockAuthService);
    jest.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should authenticate user with valid token', async () => {
      const mockPayload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'access' as const,
      };

      mockAuthService.verifyAccessToken.mockResolvedValue(mockPayload);

      const request = createMockRequest({
        'authorization': 'Bearer valid-access-token',
      });

      const result = await authMiddleware(request);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockPayload);
      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-access-token');
    });

    it('should fail when authorization header is missing', async () => {
      const request = createMockRequest();

      const result = await authMiddleware(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authorization header is required');
    });

    it('should fail when authorization header format is invalid', async () => {
      const request = createMockRequest({
        'authorization': 'InvalidFormat token',
      });

      const result = await authMiddleware(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid authorization header format. Use: Bearer <token>');
    });

    it('should fail when token is empty', async () => {
      const request = createMockRequest({
        'authorization': 'Bearer ',
      });

      const result = await authMiddleware(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access token is required');
    });

    it('should fail when token is invalid', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid access token'));

      const request = createMockRequest({
        'authorization': 'Bearer invalid-token',
      });

      const result = await authMiddleware(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid access token');
    });

    it('should handle unexpected errors', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Unexpected error'));

      const request = createMockRequest({
        'authorization': 'Bearer some-token',
      });

      const result = await authMiddleware(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected error');
    });

    it('should handle non-Error exceptions', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue('String error');

      const request = createMockRequest({
        'authorization': 'Bearer some-token',
      });

      const result = await authMiddleware(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should authenticate user with valid token', async () => {
      const mockPayload = {
        userId: 'user-1',
        email: 'test@example.com',
        type: 'access' as const,
      };

      mockAuthService.verifyAccessToken.mockResolvedValue(mockPayload);

      const request = createMockRequest({
        'authorization': 'Bearer valid-access-token',
      });

      const result = await optionalAuthMiddleware(request);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockPayload);
      expect(mockAuthService.verifyAccessToken).toHaveBeenCalledWith('valid-access-token');
    });

    it('should succeed without user when authorization header is missing', async () => {
      const request = createMockRequest();

      const result = await optionalAuthMiddleware(request);

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
    });

    it('should succeed without user when authorization header format is invalid', async () => {
      const request = createMockRequest({
        'authorization': 'InvalidFormat token',
      });

      const result = await optionalAuthMiddleware(request);

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
    });

    it('should succeed without user when token is empty', async () => {
      const request = createMockRequest({
        'authorization': 'Bearer ',
      });

      const result = await optionalAuthMiddleware(request);

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
    });

    it('should succeed without user when token is invalid', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid access token'));

      const request = createMockRequest({
        'authorization': 'Bearer invalid-token',
      });

      const result = await optionalAuthMiddleware(request);

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
    });

    it('should succeed without user on unexpected errors', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Unexpected error'));

      const request = createMockRequest({
        'authorization': 'Bearer some-token',
      });

      const result = await optionalAuthMiddleware(request);

      expect(result.success).toBe(true);
      expect(result.user).toBeUndefined();
    });
  });
});