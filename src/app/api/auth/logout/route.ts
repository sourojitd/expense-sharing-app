import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error,
      }, { status: 401 });
    }
    
    await authService.logout(authResult.user!.userId);
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}