import { describe, it, expect } from '@jest/globals';
import { Decimal } from '@prisma/client/runtime/library';
import {
  Expense,
  ExpenseSplit,
  SplitType,
  ExpenseCategory,
  ExpenseCreateSchema,
  ExpenseSplitCreateSchema,
} from '../../lib/models/expense';

describe('Expense Model', () => {
  describe('Validation Schemas', () => {
    describe('ExpenseCreateSchema', () => {
      it('should validate valid expense data', () => {
        const validData = {
          description: 'Dinner at restaurant',
          amount: 50.00,
          currency: 'USD',
          date: new Date('2024-01-15'),
          paidBy: '123e4567-e89b-12d3-a456-426614174000',
          groupId: '123e4567-e89b-12d3-a456-426614174001',
          category: ExpenseCategory.FOOD,
          receipt: 'https://example.com/receipt.jpg',
          notes: 'Great dinner with friends',
          splits: [
            { userId: '123e4567-e89b-12d3-a456-426614174002', amount: 25.00 },
            { userId: '123e4567-e89b-12d3-a456-426614174003', amount: 25.00 }
          ]
        };

        const result = ExpenseCreateSchema.parse(validData);
        expect(result).toEqual(validData);
      });

      it('should require description', () => {
        const invalidData = {
          amount: 50.00,
          currency: 'USD',
          date: new Date('2024-01-15'),
          paidBy: '123e4567-e89b-12d3-a456-426614174000',
          splits: [{ userId: '123e4567-e89b-12d3-a456-426614174002', amount: 50.00 }]
        };

        expect(() => ExpenseCreateSchema.parse(invalidData)).toThrow();
      });

      it('should validate description length', () => {
        const invalidData = {
          description: 'a'.repeat(256),
          amount: 50.00,
          currency: 'USD',
          date: new Date('2024-01-15'),
          paidBy: '123e4567-e89b-12d3-a456-426614174000',
          splits: [{ userId: '123e4567-e89b-12d3-a456-426614174002', amount: 50.00 }]
        };

        expect(() => ExpenseCreateSchema.parse(invalidData)).toThrow();
      });

      it('should require positive amount', () => {
        const invalidData = {
          description: 'Test expense',
          amount: -10.00,
          currency: 'USD',
          date: new Date('2024-01-15'),
          paidBy: '123e4567-e89b-12d3-a456-426614174000',
          splits: [{ userId: '123e4567-e89b-12d3-a456-426614174002', amount: 50.00 }]
        };

        expect(() => ExpenseCreateSchema.parse(invalidData)).toThrow();
      });

      it('should validate currency format', () => {
        const invalidData = {
          description: 'Test expense',
          amount: 50.00,
          currency: 'usd',
          date: new Date('2024-01-15'),
          paidBy: '123e4567-e89b-12d3-a456-426614174000',
          splits: [{ userId: '123e4567-e89b-12d3-a456-426614174002', amount: 50.00 }]
        };

        expect(() => ExpenseCreateSchema.parse(invalidData)).toThrow();
      });

      it('should not allow future dates', () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        const invalidData = {
          description: 'Test expense',
          amount: 50.00,
          currency: 'USD',
          date: futureDate,
          paidBy: '123e4567-e89b-12d3-a456-426614174000',
          splits: [{ userId: '123e4567-e89b-12d3-a456-426614174002', amount: 50.00 }]
        };

        expect(() => ExpenseCreateSchema.parse(invalidData)).toThrow();
      });

      it('should require valid UUID for paidBy', () => {
        const invalidData = {
          description: 'Test expense',
          amount: 50.00,
          currency: 'USD',
          date: new Date('2024-01-15'),
          paidBy: 'invalid-uuid',
          splits: [{ userId: '123e4567-e89b-12d3-a456-426614174002', amount: 50.00 }]
        };

        expect(() => ExpenseCreateSchema.parse(invalidData)).toThrow();
      });

      it('should require at least one split', () => {
        const invalidData = {
          description: 'Test expense',
          amount: 50.00,
          currency: 'USD',
          date: new Date('2024-01-15'),
          paidBy: '123e4567-e89b-12d3-a456-426614174000',
          splits: []
        };

        expect(() => ExpenseCreateSchema.parse(invalidData)).toThrow();
      });

      it('should validate receipt URL format', () => {
        const invalidData = {
          description: 'Test expense',
          amount: 50.00,
          currency: 'USD',
          date: new Date('2024-01-15'),
          paidBy: '123e4567-e89b-12d3-a456-426614174000',
          receipt: 'not-a-url',
          splits: [{ userId: '123e4567-e89b-12d3-a456-426614174002', amount: 50.00 }]
        };

        expect(() => ExpenseCreateSchema.parse(invalidData)).toThrow();
      });

      it('should validate notes length', () => {
        const invalidData = {
          description: 'Test expense',
          amount: 50.00,
          currency: 'USD',
          date: new Date('2024-01-15'),
          paidBy: '123e4567-e89b-12d3-a456-426614174000',
          notes: 'a'.repeat(1001),
          splits: [{ userId: '123e4567-e89b-12d3-a456-426614174002', amount: 50.00 }]
        };

        expect(() => ExpenseCreateSchema.parse(invalidData)).toThrow();
      });
    });

    describe('ExpenseSplitCreateSchema', () => {
      it('should validate valid split data', () => {
        const validData = {
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          amount: 25.00,
          percentage: 50.0,
          shares: 2,
          settled: false
        };

        const result = ExpenseSplitCreateSchema.parse(validData);
        expect(result).toEqual(validData);
      });

      it('should require positive amount', () => {
        const invalidData = {
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          amount: -10.00
        };

        expect(() => ExpenseSplitCreateSchema.parse(invalidData)).toThrow();
      });

      it('should validate percentage range', () => {
        const invalidData = {
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          amount: 25.00,
          percentage: 150.0
        };

        expect(() => ExpenseSplitCreateSchema.parse(invalidData)).toThrow();
      });

      it('should require positive integer shares', () => {
        const invalidData = {
          expenseId: '123e4567-e89b-12d3-a456-426614174000',
          userId: '123e4567-e89b-12d3-a456-426614174001',
          amount: 25.00,
          shares: -1
        };

        expect(() => ExpenseSplitCreateSchema.parse(invalidData)).toThrow();
      });
    });
  });

  describe('Expense Class', () => {
    let expense: Expense;

    beforeEach(() => {
      expense = new Expense(
        '123e4567-e89b-12d3-a456-426614174000',
        'Test expense',
        new Decimal(100.00),
        'USD',
        new Date('2024-01-15'),
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174002',
        ExpenseCategory.FOOD,
        'https://example.com/receipt.jpg',
        'Test notes'
      );
    });

    describe('getAmountAsNumber', () => {
      it('should convert Decimal amount to number', () => {
        expect(expense.getAmountAsNumber()).toBe(100.00);
      });
    });

    describe('isGroupExpense', () => {
      it('should return true for group expenses', () => {
        expect(expense.isGroupExpense()).toBe(true);
      });

      it('should return false for non-group expenses', () => {
        expense.groupId = null;
        expect(expense.isGroupExpense()).toBe(false);
      });
    });

    describe('validateSplitAmounts', () => {
      it('should validate when splits equal total amount', () => {
        const splits = [
          { amount: 50.00 },
          { amount: 30.00 },
          { amount: 20.00 }
        ];
        expect(Expense.validateSplitAmounts(100.00, splits)).toBe(true);
      });

      it('should reject when splits do not equal total amount', () => {
        const splits = [
          { amount: 50.00 },
          { amount: 30.00 }
        ];
        expect(Expense.validateSplitAmounts(100.00, splits)).toBe(false);
      });

      it('should allow small floating point differences', () => {
        const splits = [
          { amount: 33.33 },
          { amount: 33.33 },
          { amount: 33.34 }
        ];
        expect(Expense.validateSplitAmounts(100.00, splits)).toBe(true);
      });
    });

    describe('validateSplitPercentages', () => {
      it('should validate when percentages equal 100%', () => {
        const splits = [
          { percentage: 50.0 },
          { percentage: 30.0 },
          { percentage: 20.0 }
        ];
        expect(Expense.validateSplitPercentages(splits)).toBe(true);
      });

      it('should reject when percentages do not equal 100%', () => {
        const splits = [
          { percentage: 50.0 },
          { percentage: 30.0 }
        ];
        expect(Expense.validateSplitPercentages(splits)).toBe(false);
      });

      it('should handle missing percentages', () => {
        const splits = [
          { percentage: 50.0 },
          {},
          { percentage: 50.0 }
        ];
        expect(Expense.validateSplitPercentages(splits)).toBe(true);
      });
    });

    describe('calculateSplitAmounts', () => {
      const participants = [
        { userId: 'user1' },
        { userId: 'user2' },
        { userId: 'user3' }
      ];

      describe('EQUAL split', () => {
        it('should split amount equally among participants', () => {
          const result = Expense.calculateSplitAmounts(100.00, SplitType.EQUAL, participants);
          
          expect(result).toHaveLength(3);
          expect(result[0]).toEqual({ userId: 'user1', amount: 33.33 });
          expect(result[1]).toEqual({ userId: 'user2', amount: 33.33 });
          expect(result[2]).toEqual({ userId: 'user3', amount: 33.33 });
        });
      });

      describe('EXACT split', () => {
        it('should use exact amounts when provided', () => {
          const exactParticipants = [
            { userId: 'user1', amount: 40.00 },
            { userId: 'user2', amount: 35.00 },
            { userId: 'user3', amount: 25.00 }
          ];

          const result = Expense.calculateSplitAmounts(100.00, SplitType.EXACT, exactParticipants);
          
          expect(result).toHaveLength(3);
          expect(result[0]).toEqual({ userId: 'user1', amount: 40.00 });
          expect(result[1]).toEqual({ userId: 'user2', amount: 35.00 });
          expect(result[2]).toEqual({ userId: 'user3', amount: 25.00 });
        });

        it('should throw error when amounts do not match total', () => {
          const exactParticipants = [
            { userId: 'user1', amount: 40.00 },
            { userId: 'user2', amount: 35.00 }
          ];

          expect(() => {
            Expense.calculateSplitAmounts(100.00, SplitType.EXACT, exactParticipants);
          }).toThrow('Split amounts (75) do not equal total amount (100)');
        });

        it('should throw error when amounts are missing', () => {
          const exactParticipants = [
            { userId: 'user1', amount: 40.00 },
            { userId: 'user2' }
          ];

          expect(() => {
            Expense.calculateSplitAmounts(100.00, SplitType.EXACT, exactParticipants);
          }).toThrow('All participants must have exact amounts specified');
        });
      });

      describe('PERCENTAGE split', () => {
        it('should calculate amounts based on percentages', () => {
          const percentageParticipants = [
            { userId: 'user1', percentage: 50.0 },
            { userId: 'user2', percentage: 30.0 },
            { userId: 'user3', percentage: 20.0 }
          ];

          const result = Expense.calculateSplitAmounts(100.00, SplitType.PERCENTAGE, percentageParticipants);
          
          expect(result).toHaveLength(3);
          expect(result[0]).toEqual({ userId: 'user1', amount: 50.00, percentage: 50.0 });
          expect(result[1]).toEqual({ userId: 'user2', amount: 30.00, percentage: 30.0 });
          expect(result[2]).toEqual({ userId: 'user3', amount: 20.00, percentage: 20.0 });
        });

        it('should throw error when percentages do not equal 100%', () => {
          const percentageParticipants = [
            { userId: 'user1', percentage: 50.0 },
            { userId: 'user2', percentage: 30.0 }
          ];

          expect(() => {
            Expense.calculateSplitAmounts(100.00, SplitType.PERCENTAGE, percentageParticipants);
          }).toThrow('Split percentages (80%) do not equal 100%');
        });

        it('should throw error when percentages are missing', () => {
          const percentageParticipants = [
            { userId: 'user1', percentage: 50.0 },
            { userId: 'user2' }
          ];

          expect(() => {
            Expense.calculateSplitAmounts(100.00, SplitType.PERCENTAGE, percentageParticipants);
          }).toThrow('All participants must have percentages specified');
        });
      });

      describe('SHARES split', () => {
        it('should calculate amounts based on shares', () => {
          const shareParticipants = [
            { userId: 'user1', shares: 2 },
            { userId: 'user2', shares: 2 },
            { userId: 'user3', shares: 1 }
          ];

          const result = Expense.calculateSplitAmounts(100.00, SplitType.SHARES, shareParticipants);
          
          expect(result).toHaveLength(3);
          expect(result[0]).toEqual({ userId: 'user1', amount: 40.00, shares: 2 });
          expect(result[1]).toEqual({ userId: 'user2', amount: 40.00, shares: 2 });
          expect(result[2]).toEqual({ userId: 'user3', amount: 20.00, shares: 1 });
        });

        it('should throw error when shares are zero', () => {
          const shareParticipants = [
            { userId: 'user1', shares: 0 },
            { userId: 'user2', shares: 0 }
          ];

          expect(() => {
            Expense.calculateSplitAmounts(100.00, SplitType.SHARES, shareParticipants);
          }).toThrow('Total shares cannot be zero');
        });

        it('should throw error when shares are missing', () => {
          const shareParticipants = [
            { userId: 'user1', shares: 2 },
            { userId: 'user2' }
          ];

          expect(() => {
            Expense.calculateSplitAmounts(100.00, SplitType.SHARES, shareParticipants);
          }).toThrow('All participants must have shares specified');
        });
      });

      it('should throw error for unsupported split type', () => {
        expect(() => {
          Expense.calculateSplitAmounts(100.00, 'unsupported' as SplitType, participants);
        }).toThrow('Unsupported split type: unsupported');
      });
    });
  });

  describe('ExpenseSplit Class', () => {
    let expenseSplit: ExpenseSplit;

    beforeEach(() => {
      expenseSplit = new ExpenseSplit(
        '123e4567-e89b-12d3-a456-426614174000',
        '123e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174002',
        new Decimal(50.00),
        new Decimal(50.0),
        2,
        false
      );
    });

    describe('getAmountAsNumber', () => {
      it('should convert Decimal amount to number', () => {
        expect(expenseSplit.getAmountAsNumber()).toBe(50.00);
      });
    });

    describe('getPercentageAsNumber', () => {
      it('should convert Decimal percentage to number', () => {
        expect(expenseSplit.getPercentageAsNumber()).toBe(50.0);
      });

      it('should return null when percentage is null', () => {
        expenseSplit.percentage = null;
        expect(expenseSplit.getPercentageAsNumber()).toBeNull();
      });
    });

    describe('isSettled', () => {
      it('should return false when not settled', () => {
        expect(expenseSplit.isSettled()).toBe(false);
      });

      it('should return true when settled', () => {
        expenseSplit.settled = true;
        expect(expenseSplit.isSettled()).toBe(true);
      });
    });

    describe('settle', () => {
      it('should mark split as settled', () => {
        expenseSplit.settle();
        expect(expenseSplit.settled).toBe(true);
      });
    });

    describe('unsettle', () => {
      it('should mark split as unsettled', () => {
        expenseSplit.settled = true;
        expenseSplit.unsettle();
        expect(expenseSplit.settled).toBe(false);
      });
    });
  });
});