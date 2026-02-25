import { PrismaClient } from '@prisma/client';
import { CommentRepository, CommentCreateData, CommentUpdateData, CommentQueryOptions } from '../repositories/comment.repository';
import { ExpenseRepository } from '../repositories/expense.repository';

export class CommentService {
  private commentRepository: CommentRepository;
  private expenseRepository: ExpenseRepository;

  constructor(private prisma: PrismaClient) {
    this.commentRepository = new CommentRepository(prisma);
    this.expenseRepository = new ExpenseRepository(prisma);
  }

  /**
   * Get comments for an expense (verifies user can access the expense)
   */
  async getCommentsByExpense(expenseId: string, userId: string, options?: CommentQueryOptions) {
    // Verify the expense exists
    const expenseExists = await this.expenseRepository.checkExpenseExists(expenseId);
    if (!expenseExists) {
      throw new Error('Expense not found');
    }

    // Verify user can access the expense
    await this.verifyExpenseAccess(expenseId, userId);

    return await this.commentRepository.getCommentsByExpense(expenseId, options);
  }

  /**
   * Create a comment on an expense
   */
  async createComment(data: CommentCreateData) {
    // Validate content is not empty
    if (!data.content || data.content.trim().length === 0) {
      throw new Error('Comment content is required');
    }

    // Verify the expense exists
    const expenseExists = await this.expenseRepository.checkExpenseExists(data.expenseId);
    if (!expenseExists) {
      throw new Error('Expense not found');
    }

    // Verify user can access the expense
    await this.verifyExpenseAccess(data.expenseId, data.userId);

    return await this.commentRepository.createComment({
      ...data,
      content: data.content.trim(),
    });
  }

  /**
   * Update a comment (verifies ownership)
   */
  async updateComment(id: string, userId: string, data: CommentUpdateData) {
    // Validate content is not empty
    if (!data.content || data.content.trim().length === 0) {
      throw new Error('Comment content is required');
    }

    const comment = await this.commentRepository.updateComment(id, userId, {
      content: data.content.trim(),
    });

    if (!comment) {
      throw new Error('Comment not found or you do not have permission to update it');
    }

    return comment;
  }

  /**
   * Delete a comment (verifies ownership)
   */
  async deleteComment(id: string, userId: string) {
    const deleted = await this.commentRepository.deleteComment(id, userId);

    if (!deleted) {
      throw new Error('Comment not found or you do not have permission to delete it');
    }
  }

  /**
   * Verify that a user can access an expense (must be the payer or have a split)
   */
  private async verifyExpenseAccess(expenseId: string, userId: string) {
    const canAccess = await this.expenseRepository.checkUserCanAccessExpense(expenseId, userId);
    if (!canAccess) {
      throw new Error('Access denied: You do not have permission to access this expense');
    }
  }
}
