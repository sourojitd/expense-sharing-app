import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Verification token is required',
      }, { status: 400 });
    }

    await authService.verifyEmail(token);

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Email verification error:', error);

    if (error instanceof Error) {
      if (error.message === 'Token has expired') {
        return NextResponse.json({
          success: false,
          error: 'Verification link has expired. Please request a new one.',
        }, { status: 400 });
      }

      if (error.message === 'Invalid token' || error.message === 'Invalid token type') {
        return NextResponse.json({
          success: false,
          error: 'Invalid verification link.',
        }, { status: 400 });
      }

      if (error.message === 'Email is already verified') {
        return NextResponse.json({
          success: false,
          error: 'Email is already verified.',
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
