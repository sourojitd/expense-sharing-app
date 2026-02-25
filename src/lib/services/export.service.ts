import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PrismaClient } from '@prisma/client';

export interface ExportableExpense {
  description: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  paidBy: string;
  group: string;
  splits: string; // formatted as "User1: $25, User2: $25"
}

export class ExportService {
  constructor(private prisma: PrismaClient) {}

  async getExportData(
    userId: string,
    filters?: {
      groupId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): Promise<ExportableExpense[]> {
    // Build where clause based on filters
    const where: Record<string, unknown> = {
      OR: [
        { paidBy: userId },
        { splits: { some: { userId } } },
      ],
    };

    if (filters?.groupId) {
      where.groupId = filters.groupId;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      const dateFilter: Record<string, Date> = {};
      if (filters.dateFrom) {
        dateFilter.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        dateFilter.lte = new Date(filters.dateTo);
      }
      where.date = dateFilter;
    }

    const expenses = await this.prisma.expense.findMany({
      where,
      include: {
        payer: {
          select: { id: true, name: true },
        },
        group: {
          select: { id: true, name: true },
        },
        splits: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Transform into ExportableExpense format
    return expenses.map((expense) => {
      const splitsFormatted = expense.splits
        .map(
          (split) =>
            `${split.user.name}: ${expense.currency} ${Number(split.amount).toFixed(2)}`
        )
        .join(', ');

      return {
        description: expense.description,
        amount: Number(expense.amount),
        currency: expense.currency,
        date: new Date(expense.date).toLocaleDateString(),
        category: expense.category || '',
        paidBy: expense.payer.name,
        group: expense.group?.name || '',
        splits: splitsFormatted,
      };
    });
  }

  generateCSV(expenses: ExportableExpense[]): string {
    return Papa.unparse(
      expenses.map((e) => ({
        Description: e.description,
        Amount: e.amount,
        Currency: e.currency,
        Date: e.date,
        Category: e.category,
        'Paid By': e.paidBy,
        Group: e.group,
        Splits: e.splits,
      }))
    );
  }

  generatePDF(
    expenses: ExportableExpense[],
    title: string = 'Expense Report'
  ): Buffer {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text(title, 14, 22);

    // Subtitle with date
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30);

    // Summary
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    doc.text(
      `Total Expenses: ${expenses.length} | Total Amount: $${total.toFixed(2)}`,
      14,
      38
    );

    // Table using autoTable
    autoTable(doc, {
      startY: 45,
      head: [['Description', 'Amount', 'Date', 'Category', 'Paid By', 'Group']],
      body: expenses.map((e) => [
        e.description,
        `${e.currency} ${e.amount.toFixed(2)}`,
        e.date,
        e.category || '-',
        e.paidBy,
        e.group || '-',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    return Buffer.from(doc.output('arraybuffer'));
  }
}
