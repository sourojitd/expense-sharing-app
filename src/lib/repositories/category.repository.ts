import { PrismaClient } from '@prisma/client';

export interface CategoryCreateData {
  name: string;
  icon?: string;
  color?: string;
  userId: string;
}

export interface CategoryUpdateData {
  name?: string;
  icon?: string;
  color?: string;
}

export class CategoryRepository {
  constructor(private prisma: PrismaClient) {}

  async getUserCategories(userId: string) {
    const categories = await this.prisma.customCategory.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  async getCategoryById(id: string) {
    const category = await this.prisma.customCategory.findUnique({
      where: { id },
    });

    return category;
  }

  async getCategoryByName(userId: string, name: string) {
    const category = await this.prisma.customCategory.findUnique({
      where: {
        userId_name: { userId, name },
      },
    });

    return category;
  }

  async createCategory(data: CategoryCreateData) {
    const category = await this.prisma.customCategory.create({
      data: {
        name: data.name,
        icon: data.icon,
        color: data.color,
        userId: data.userId,
      },
    });

    return category;
  }

  async updateCategory(id: string, userId: string, data: CategoryUpdateData) {
    // Verify ownership before updating
    const existing = await this.prisma.customCategory.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return null;
    }

    const category = await this.prisma.customCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.icon !== undefined && { icon: data.icon }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });

    return category;
  }

  async deleteCategory(id: string, userId: string) {
    // Verify ownership before deleting
    const existing = await this.prisma.customCategory.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return false;
    }

    await this.prisma.customCategory.delete({
      where: { id },
    });

    return true;
  }
}
