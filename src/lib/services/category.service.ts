import { PrismaClient } from '@prisma/client';
import { CategoryRepository, CategoryCreateData, CategoryUpdateData } from '../repositories/category.repository';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor(private prisma: PrismaClient) {
    this.categoryRepository = new CategoryRepository(prisma);
  }

  /**
   * Get all custom categories for a user
   */
  async getUserCategories(userId: string) {
    return await this.categoryRepository.getUserCategories(userId);
  }

  /**
   * Create a new custom category
   */
  async createCategory(data: CategoryCreateData) {
    // Validate name is not empty
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    const trimmedName = data.name.trim();

    // Check for duplicate name for the same user
    const existing = await this.categoryRepository.getCategoryByName(data.userId, trimmedName);
    if (existing) {
      throw new Error('A category with this name already exists');
    }

    return await this.categoryRepository.createCategory({
      ...data,
      name: trimmedName,
    });
  }

  /**
   * Update a custom category (verifies ownership)
   */
  async updateCategory(id: string, userId: string, data: CategoryUpdateData) {
    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Category name cannot be empty');
      }

      const trimmedName = data.name.trim();

      // Check for duplicate name for the same user (excluding current category)
      const existing = await this.categoryRepository.getCategoryByName(userId, trimmedName);
      if (existing && existing.id !== id) {
        throw new Error('A category with this name already exists');
      }

      data = { ...data, name: trimmedName };
    }

    const category = await this.categoryRepository.updateCategory(id, userId, data);

    if (!category) {
      throw new Error('Category not found or you do not have permission to update it');
    }

    return category;
  }

  /**
   * Delete a custom category (verifies ownership)
   */
  async deleteCategory(id: string, userId: string) {
    const deleted = await this.categoryRepository.deleteCategory(id, userId);

    if (!deleted) {
      throw new Error('Category not found or you do not have permission to delete it');
    }
  }
}
