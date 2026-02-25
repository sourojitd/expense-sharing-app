import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json({
        success: false,
        error: authResult.error,
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: true,
      data: { user: authResult.user },
    }, { status: 200 });
  } catch (error) {
    console.error('Get user error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
    }, { status: 500 });
  }
}