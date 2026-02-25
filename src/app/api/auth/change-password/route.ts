import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';
import { ZodError } from 'zod';

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
    
    const body = await request.json();
    
    await authService.changePassword(authResult.user!.userId, body);
    
    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      }, { status: 400 });
    }
    
    if (error instanceof Error) {
      if (error.message === 'Current password is incorrect') {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        error: error.message,
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}