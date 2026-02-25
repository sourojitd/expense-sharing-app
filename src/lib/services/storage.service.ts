import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export class StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'public', 'uploads');
  }

  async saveFile(
    file: File,
    type: 'receipts' | 'profiles' | 'groups',
    userId: string
  ): Promise<string> {
    // Validate file size (max 5MB)
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds the maximum allowed size of 5MB');
    }

    // Validate file type
    const ext = this.getExtension(file.name);

    if (type === 'receipts') {
      if (!this.isValidReceiptType(ext)) {
        throw new Error(
          'Invalid file type. Allowed types for receipts: jpg, jpeg, png, gif, webp, pdf'
        );
      }
    } else {
      if (!this.isValidImageType(ext)) {
        throw new Error(
          'Invalid file type. Allowed types: jpg, jpeg, png, gif, webp'
        );
      }
    }

    // Create directory: public/uploads/{type}/{userId}/
    const uploadDir = path.join(this.baseDir, type, userId);
    await this.ensureDir(uploadDir);

    // Generate unique filename: {uuid}.{ext}
    const filename = `${randomUUID()}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // Return URL path: /uploads/{type}/{userId}/{filename}
    return `/uploads/${type}/${userId}/${filename}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    // Convert URL path back to filesystem path
    // filePath is expected to be like /uploads/{type}/{userId}/{filename}
    const relativePath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
    const absolutePath = path.join(process.cwd(), 'public', relativePath);

    // Delete the file if it exists
    try {
      await fs.access(absolutePath);
      await fs.unlink(absolutePath);
    } catch {
      // File does not exist or cannot be accessed, silently ignore
    }
  }

  private async ensureDir(dir: string): Promise<void> {
    await fs.mkdir(dir, { recursive: true });
  }

  private getExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  private isValidImageType(ext: string): boolean {
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
  }

  private isValidReceiptType(ext: string): boolean {
    return this.isValidImageType(ext) || ext === '.pdf';
  }
}
