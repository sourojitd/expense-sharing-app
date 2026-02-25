import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ZodError } from 'zod';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await authService.login(body);
    
    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      }, { status: 400 });
    }
    
    if (error instanceof Error) {
      if (error.message === 'Invalid email or password' || 
          error.message === 'Please verify your email before logging in') {
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