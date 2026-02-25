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

    const userId = authResult.user!.userId;

    await authService.requestEmailVerification(userId);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Request verification error:', error);

    if (error instanceof Error) {
      if (error.message === 'Email is already verified') {
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
