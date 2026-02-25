import { z } from 'zod';
import { Decimal } from '@prisma/client/runtime/library';

// Enums for expense-related types
export enum SplitType {
  EQUAL = 'equal',
  EXACT = 'exact',
  PERCENTAGE = 'percentage',
  SHARES = 'shares'
}

export enum ExpenseCategory {
  FOOD = 'food',
  TRANSPORTATION = 'transportation',
  ACCOMMODATION = 'accommodation',
  ENTERTAINMENT = 'entertainment',
  SHOPPING = 'shopping',
  UTILITIES = 'utilities',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  OTHER = 'other'
}

// Validation schemas
export const ExpenseCreateSchema = z.object({
  description: z.string()
    .min(1, 'Description is required')
    .max(255, 'Description must be less than 255 characters'),
  amount: z.number()
    .positive('Amount must be positive')
    .max(999999.99, 'Amount cannot exceed 999,999.99'),
  currency: z.string()
    .length(3, 'Currency must be a 3-letter code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase letters'),
  date: z.date()
    .max(new Date(), 'Date cannot be in the future'),
  paidBy: z.string()
    .uuid('Invalid user ID'),
  groupId: z.string()
    .uuid('Invalid group ID')
    .optional(),
  category: z.nativeEnum(ExpenseCategory)
    .optional()
    .default(ExpenseCategory.OTHER),
  receipt: z.string()
    .url('Receipt must be a valid URL')
    .optional(),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional(),
  splits: z.array(z.object({
    userId: z.string().uuid('Invalid user ID'),
    amount: z.number().positive('Split amount must be positive').optional(),
    percentage: z.number().min(0).max(100, 'Percentage must be between 0 and 100').optional(),
    shares: z.number().int().positive('Shares must be a positive integer').optional()
  })).min(1, 'At least one split is required')
});

export const ExpenseUpdateSchema = ExpenseCreateSchema.partial().omit({ splits: true });

export const ExpenseSplitCreateSchema = z.object({
  expenseId: z.string().uuid('Invalid expense ID'),
  userId: z.string().uuid('Invalid user ID'),
  amount: z.number().positive('Amount must be positive'),
  percentage: z.number()
    .min(0)
    .max(100, 'Percentage must be between 0 and 100')
    .optional(),
  shares: z.number()
    .int()
    .positive('Shares must be a positive integer')
    .optional(),
  settled: z.boolean().default(false)
});

export const ExpenseSplitUpdateSchema = ExpenseSplitCreateSchema.partial().omit({ expenseId: true });

// Type definitions
export type ExpenseCreateData = z.infer<typeof ExpenseCreateSchema>;
export type ExpenseUpdateData = z.infer<typeof ExpenseUpdateSchema>;
export type ExpenseSplitCreateData = z.infer<typeof ExpenseSplitCreateSchema>;
export type ExpenseSplitUpdateData = z.infer<typeof ExpenseSplitUpdateSchema>;

// Expense model class
export class Expense {
  constructor(
    public id: string,
    public description: string,
    public amount: Decimal,
    public currency: string,
    public date: Date,
    public paidBy: string,
    public groupId: string | null = null,
    public category: string | null = null,
    public receipt: string | null = null,
    public notes: string | null = null,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static validate(data: unknown): ExpenseCreateData {
    return ExpenseCreateSchema.parse(data);
  }

  static validateUpdate(data: unknown): ExpenseUpdateData {
    return ExpenseUpdateSchema.parse(data);
  }

  // Convert amount to number for calculations
  getAmountAsNumber(): number {
    return this.amount.toNumber();
  }

  // Check if expense is in a group
  isGroupExpense(): boolean {
    return this.groupId !== null;
  }

  // Validate that splits add up to the total amount
  static validateSplitAmounts(totalAmount: number, splits: { amount: number }[]): boolean {
    const splitTotal = splits.reduce((sum, split) => sum + split.amount, 0);
    // Allow for small floating point differences (within 0.01)
    return Math.abs(splitTotal - totalAmount) < 0.01;
  }

  // Validate that percentages add up to 100%
  static validateSplitPercentages(splits: { percentage?: number }[]): boolean {
    const percentageTotal = splits.reduce((sum, split) => sum + (split.percentage || 0), 0);
    // Allow for small floating point differences (within 0.01)
    return Math.abs(percentageTotal - 100) < 0.01;
  }

  // Calculate split amounts based on type
  static calculateSplitAmounts(
    totalAmount: number,
    splitType: SplitType,
    participants: Array<{
      userId: string;
      amount?: number;
      percentage?: number;
      shares?: number;
    }>
  ): Array<{ userId: string; amount: number; percentage?: number; shares?: number }> {
    switch (splitType) {
      case SplitType.EQUAL:
        const equalAmount = totalAmount / participants.length;
        return participants.map(p => ({
          userId: p.userId,
          amount: Math.round(equalAmount * 100) / 100 // Round to 2 decimal places
        }));

      case SplitType.EXACT:
        if (!participants.every(p => p.amount !== undefined)) {
          throw new Error('All participants must have exact amounts specified');
        }
        const exactTotal = participants.reduce((sum, p) => sum + (p.amount || 0), 0);
        if (!this.validateSplitAmounts(totalAmount, participants as { amount: number }[])) {
          throw new Error(`Split amounts (${exactTotal}) do not equal total amount (${totalAmount})`);
        }
        return participants.map(p => ({
          userId: p.userId,
          amount: p.amount!
        }));

      case SplitType.PERCENTAGE:
        if (!participants.every(p => p.percentage !== undefined)) {
          throw new Error('All participants must have percentages specified');
        }
        if (!this.validateSplitPercentages(participants)) {
          const percentageTotal = participants.reduce((sum, p) => sum + (p.percentage || 0), 0);
          throw new Error(`Split percentages (${percentageTotal}%) do not equal 100%`);
        }
        return participants.map(p => ({
          userId: p.userId,
          amount: Math.round((totalAmount * (p.percentage! / 100)) * 100) / 100,
          percentage: p.percentage!
        }));

      case SplitType.SHARES:
        if (!participants.every(p => p.shares !== undefined)) {
          throw new Error('All participants must have shares specified');
        }
        const totalShares = participants.reduce((sum, p) => sum + (p.shares || 0), 0);
        if (totalShares === 0) {
          throw new Error('Total shares cannot be zero');
        }
        return participants.map(p => ({
          userId: p.userId,
          amount: Math.round((totalAmount * (p.shares! / totalShares)) * 100) / 100,
          shares: p.shares!
        }));

      default:
        throw new Error(`Unsupported split type: ${splitType}`);
    }
  }
}

// ExpenseSplit model class
export class ExpenseSplit {
  constructor(
    public id: string,
    public expenseId: string,
    public userId: string,
    public amount: Decimal,
    public percentage: Decimal | null = null,
    public shares: number | null = null,
    public settled: boolean = false,
    public createdAt: Date = new Date()
  ) {}

  static validate(data: unknown): ExpenseSplitCreateData {
    return ExpenseSplitCreateSchema.parse(data);
  }

  static validateUpdate(data: unknown): ExpenseSplitUpdateData {
    return ExpenseSplitUpdateSchema.parse(data);
  }

  // Convert amount to number for calculations
  getAmountAsNumber(): number {
    return this.amount.toNumber();
  }

  // Convert percentage to number for calculations
  getPercentageAsNumber(): number | null {
    return this.percentage?.toNumber() || null;
  }

  // Check if split is settled
  isSettled(): boolean {
    return this.settled;
  }

  // Mark split as settled
  settle(): void {
    this.settled = true;
  }

  // Mark split as unsettled
  unsettle(): void {
    this.settled = false;
  }
}

// Helper types for API responses
export interface ExpenseWithSplits extends Expense {
  splits: ExpenseSplit[];
  payer?: {
    id: string;
    name: string;
    email: string;
  };
  group?: {
    id: string;
    name: string;
  };
}

export interface ExpenseFilters {
  groupId?: string;
  userId?: string;
  category?: ExpenseCategory;
  dateFrom?: Date;
  dateTo?: Date;
  settled?: boolean;
  limit?: number;
  offset?: number;
}

export interface ExpenseSummary {
  totalExpenses: number;
  totalAmount: number;
  currency: string;
  categoryBreakdown: Record<string, number>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
  }>;
}