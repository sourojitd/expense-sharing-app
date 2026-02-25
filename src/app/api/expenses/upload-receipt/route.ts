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
    const expenseId = formData.get('expenseId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Save the file using StorageService (validates size and type internally)
    const receiptUrl = await storageService.saveFile(file, 'receipts', userId);

    // If expenseId is provided, update the expense's receipt field
    if (expenseId) {
      await prisma.expense.update({
        where: { id: expenseId },
        data: { receipt: receiptUrl },
      });
    }

    return NextResponse.json({
      message: 'Receipt uploaded successfully',
      url: receiptUrl,
    });
  } catch (error) {
    console.error('Upload receipt error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload receipt' },
      { status: 500 }
    );
  }
}
