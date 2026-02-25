import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Reset token is required',
      }, { status: 400 });
    }

    if (!newPassword || typeof newPassword !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'New password is required',
      }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({
        success: false,
        error: 'Password must be at least 8 characters long',
      }, { status: 400 });
    }

    await authService.resetPassword(token, newPassword);

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);

    if (error instanceof Error) {
      if (error.message === 'Token has expired') {
        return NextResponse.json({
          success: false,
          error: 'Reset link has expired. Please request a new one.',
        }, { status: 400 });
      }

      if (error.message === 'Invalid token' || error.message === 'Invalid token type') {
        return NextResponse.json({
          success: false,
          error: 'Invalid reset link.',
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
