import { NextRequest, NextResponse } from 'next/server';
import { ContactImportService } from '@/lib/services/contact-import.service';
import { authMiddleware } from '@/lib/middleware/auth.middleware';

const contactImportService = new ContactImportService();

export async function POST(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { contacts } = body;

    if (!contacts || !Array.isArray(contacts)) {
      return NextResponse.json(
        { error: 'Contacts array is required' },
        { status: 400 }
      );
    }

    const suggestions = await contactImportService.suggestFriendsFromContacts(
      authResult.user!.userId,
      contacts
    );

    return NextResponse.json({
      message: 'Friend suggestions generated successfully',
      suggestions
    });
  } catch (error) {
    console.error('Contact suggestions error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}