import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth.service';
import { ZodError } from 'zod';

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const result = await authService.register(body);
    
    return NextResponse.json({
      success: true,
      data: result,
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation error',
        details: error.issues,
      }, { status: 400 });
    }
    
    if (error instanceof Error) {
      if (error.message === 'User with this email already exists') {
        return NextResponse.json({
          success: false,
          error: error.message,
        }, { status: 409 });
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