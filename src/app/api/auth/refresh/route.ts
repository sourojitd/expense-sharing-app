import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;
    
    if (!refreshToken) {
      return NextResponse.json({
        success: false,
        error: 'Refresh token is required',
      }, { status: 400 });
    }
    
    const tokens = await authService.refreshToken(refreshToken);
    
    return NextResponse.json({
      success: true,
      data: { tokens },
    }, { status: 200 });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Invalid refresh token') || 
          error.message === 'User not found') {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 401 });
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