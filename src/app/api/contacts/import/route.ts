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

    const formData = await request.formData();
    const file = formData.get('contactFile') as File;
    const format = formData.get('format') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!format || !['csv', 'vcard'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be "csv" or "vcard"' },
        { status: 400 }
      );
    }

    const fileContent = await file.text();
    let contacts;

    if (format === 'csv') {
      contacts = await contactImportService.parseCSVContacts(fileContent);
    } else {
      contacts = await contactImportService.parseVCardContacts(fileContent);
    }

    // Validate contacts
    const { valid, invalid } = contactImportService.validateContactData(contacts);

    // Import valid contacts
    const importResult = await contactImportService.importContacts(valid);

    return NextResponse.json({
      message: 'Contacts imported successfully',
      result: {
        ...importResult,
        invalidContacts: invalid,
      }
    });
  } catch (error) {
    console.error('Contact import error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import contacts' },
      { status: 500 }
    );
  }
}