import { PrismaClient } from '@prisma/client';

export class RecurringExpenseRepository {
  constructor(private prisma: PrismaClient) {}

  async getByUser(
    userId: string,
    options?: { activeOnly?: boolean; groupId?: string }
  ) {
    const where: Record<string, unknown> = { paidBy: userId };

    if (options?.activeOnly) {
      where.isActive = true;
    }

    if (options?.groupId) {
      where.groupId = options.groupId;
    }

    return this.prisma.recurringExpense.findMany({
      where,
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  async getById(id: string) {
    return this.prisma.recurringExpense.findUnique({
      where: { id },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  async create(data: {
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    groupId?: string;
    category?: string;
    splitType: string;
    frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    startDate: Date;
    endDate?: Date;
    nextDueDate: Date;
    participantData: unknown;
  }) {
    return this.prisma.recurringExpense.create({
      data: {
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        paidBy: data.paidBy,
        groupId: data.groupId,
        category: data.category,
        splitType: data.splitType,
        frequency: data.frequency,
        startDate: data.startDate,
        endDate: data.endDate,
        nextDueDate: data.nextDueDate,
        participantData: data.participantData as object,
      },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      description: string;
      amount: number;
      currency: string;
      category: string;
      splitType: string;
      frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
      startDate: Date;
      endDate: Date | null;
      nextDueDate: Date;
      isActive: boolean;
      participantData: unknown;
    }>
  ) {
    const updateData: Record<string, unknown> = {};

    if (data.description !== undefined) updateData.description = data.description;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.splitType !== undefined) updateData.splitType = data.splitType;
    if (data.frequency !== undefined) updateData.frequency = data.frequency;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.nextDueDate !== undefined) updateData.nextDueDate = data.nextDueDate;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.participantData !== undefined) updateData.participantData = data.participantData as object;

    return this.prisma.recurringExpense.update({
      where: { id },
      data: updateData,
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    await this.prisma.recurringExpense.delete({
      where: { id },
    });
  }

  async getDueExpenses(date: Date) {
    return this.prisma.recurringExpense.findMany({
      where: {
        isActive: true,
        nextDueDate: {
          lte: date,
        },
      },
      include: {
        payer: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });
  }
}
