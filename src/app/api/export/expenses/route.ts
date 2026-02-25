import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth.middleware';
import { ExportService } from '@/lib/services/export.service';
import { prisma } from '@/lib/prisma';

const exportService = new ExportService(prisma);

export async function GET(request: NextRequest) {
  try {
    const authResult = await authMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      );
    }

    const userId = authResult.user!.userId;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');
    const groupId = searchParams.get('groupId') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    if (!format || !['csv', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid or missing format parameter. Use "csv" or "pdf".' },
        { status: 400 }
      );
    }

    const expenses = await exportService.getExportData(userId, {
      groupId,
      dateFrom,
      dateTo,
    });

    if (format === 'csv') {
      const csv = exportService.generateCSV(expenses);

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="splito-expenses.csv"',
        },
      });
    }

    // PDF format
    const pdfBuffer = exportService.generatePDF(expenses);

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="splito-expenses.pdf"',
      },
    });
  } catch (error) {
    console.error('Export expenses error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export expenses' },
      { status: 500 }
    );
  }
}
