import { NextRequest, NextResponse } from 'next/server';
import { ProfileService } from '@/lib/services/profile.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const profileService = new ProfileService();

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const profile = await profileService.getProfile(authResult.user!.userId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Remove sensitive data before sending
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeProfile } = profile;

    return NextResponse.json({ profile: safeProfile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone, preferredCurrency } = body;

    // Validate the profile data
    const profileData = { name, phone, preferredCurrency };
    const validationErrors = await profileService.validateProfileData(profileData);
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      );
    }

    const updatedProfile = await profileService.updateProfile(
      authResult.user!.userId,
      profileData
    );

    // Remove sensitive data before sending
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeProfile } = updatedProfile;

    return NextResponse.json({ 
      message: 'Profile updated successfully',
      profile: safeProfile 
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update profile' },
      { status: 500 }
    );
  }
}