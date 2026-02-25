import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth.middleware';
import { StorageService } from '@/lib/services/storage.service';
import { prisma } from '@/lib/prisma';

const storageService = new StorageService();

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.user!.userId;

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Delete old profile picture if it exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.profilePicture) {
      await storageService.deleteFile(user.profilePicture);
    }

    // Save the file using StorageService
    const profilePictureUrl = await storageService.saveFile(file, 'profiles', userId);

    // Update the user's profilePicture field in the database
    await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: profilePictureUrl },
    });

    return NextResponse.json({
      message: 'Profile picture uploaded successfully',
      profilePictureUrl,
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload profile picture' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete the file from storage
    if (user.profilePicture) {
      await storageService.deleteFile(user.profilePicture);
    }

    // Remove the profile picture URL from the database
    await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: null },
    });

    return NextResponse.json({
      message: 'Profile picture removed successfully',
    });
  } catch (error) {
    console.error('Profile picture removal error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove profile picture' },
      { status: 500 }
    );
  }
}