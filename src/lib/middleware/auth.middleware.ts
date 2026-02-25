import { NextRequest } from 'next/server';
import { AuthService } from '../services/auth.service';
import { TokenPayload } from '../services/auth.service';

export interface AuthMiddlewareResult {
  success: boolean;
  user?: TokenPayload;
  error?: string;
}

let authServiceInstance: AuthService | null = null;

function getAuthService(): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService();
  }
  return authServiceInstance;
}

// For testing purposes
export function setAuthService(service: AuthService): void {
  authServiceInstance = service;
}

export async function authMiddleware(request: NextRequest): Promise<AuthMiddlewareResult> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader) {
      return {
        success: false,
        error: 'Authorization header is required',
      };
    }
    
    // Check if it's a Bearer token
    if (!authHeader.startsWith('Bearer ')) {
      return {
        success: false,
        error: 'Invalid authorization header format. Use: Bearer <token>',
      };
    }
    
    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return {
        success: false,
        error: 'Access token is required',
      };
    }
    
    // Verify token
    const payload = await getAuthService().verifyAccessToken(token);
    
    return {
      success: true,
      user: payload,
    };
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

// Optional middleware for routes that don't require authentication but can use it
export async function optionalAuthMiddleware(request: NextRequest): Promise<AuthMiddlewareResult> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        success: true, // Success but no user
      };
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      return {
        success: true, // Success but no user
      };
    }
    
    const payload = await getAuthService().verifyAccessToken(token);
    
    return {
      success: true,
      user: payload,
    };
  } catch {
    // For optional auth, we don't fail on invalid tokens
    return {
      success: true, // Success but no user
    };
  }
}