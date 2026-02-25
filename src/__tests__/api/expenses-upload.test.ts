/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST as uploadReceipt } from '../../app/api/expenses/upload-receipt/route';
import { setAuthService } from '../../lib/middleware/auth.middleware';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Mock fs functions
jest.mock('fs/promises');
jest.mock('fs');

const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockMkdir = mkdir as jest.MockedFunction<typeof mkdir>;
const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

// Mock AuthService
const mockAuthService = {
  verifyAccessToken: jest.fn(),
} as any;

describe('Expense Upload API', () => {
  const mockUser = {
    userId: 'user-1',
    email: 'test@example.com',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setAuthService(mockAuthService);
    mockAuthService.verifyAccessToken.mockResolvedValue(mockUser);
    mockExistsSync.mockReturnValue(true);
    mockWriteFile.mockResolvedValue();
    mockMkdir.mockResolvedValue(undefined);
  });

  describe('POST /api/expenses/upload-receipt', () => {
    it('should upload receipt successfully', async () => {
      const mockFile = new File(['test content'], 'receipt.jpg', { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('receipt', mockFile);

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Receipt uploaded successfully');
      expect(data.url).toMatch(/^\/uploads\/receipts\/receipt_user-1_\d+\.jpg$/);
      expect(data.fileName).toMatch(/^receipt_user-1_\d+\.jpg$/);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    it('should create upload directory if it does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      
      const mockFile = new File(['test content'], 'receipt.png', { type: 'image/png' });
      
      const formData = new FormData();
      formData.append('receipt', mockFile);

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      await response.json();

      expect(response.status).toBe(200);
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads/receipts'),
        { recursive: true }
      );
    });

    it('should return 400 if no file is uploaded', async () => {
      const formData = new FormData();
      // No file added to formData

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No file uploaded');
    });

    it('should reject invalid file types', async () => {
      const mockFile = new File(['test content'], 'receipt.txt', { type: 'text/plain' });
      
      const formData = new FormData();
      formData.append('receipt', mockFile);

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid file type');
    });

    it('should reject files that are too large', async () => {
      // Create a mock file that's larger than 5MB
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      const mockFile = new File([largeContent], 'receipt.jpg', { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('receipt', mockFile);

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File size too large');
    });

    it('should accept PDF files', async () => {
      const mockFile = new File(['test content'], 'receipt.pdf', { type: 'application/pdf' });
      
      const formData = new FormData();
      formData.append('receipt', mockFile);

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toMatch(/^\/uploads\/receipts\/receipt_user-1_\d+\.pdf$/);
    });

    it('should accept PNG files', async () => {
      const mockFile = new File(['test content'], 'receipt.png', { type: 'image/png' });
      
      const formData = new FormData();
      formData.append('receipt', mockFile);

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toMatch(/^\/uploads\/receipts\/receipt_user-1_\d+\.png$/);
    });

    it('should accept GIF files', async () => {
      const mockFile = new File(['test content'], 'receipt.gif', { type: 'image/gif' });
      
      const formData = new FormData();
      formData.append('receipt', mockFile);

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.url).toMatch(/^\/uploads\/receipts\/receipt_user-1_\d+\.gif$/);
    });

    it('should return 401 without valid token', async () => {
      mockAuthService.verifyAccessToken.mockRejectedValue(new Error('Invalid token'));

      const mockFile = new File(['test content'], 'receipt.jpg', { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('receipt', mockFile);

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer invalid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Invalid token');
    });

    it('should handle file write errors', async () => {
      mockWriteFile.mockRejectedValue(new Error('Disk full'));

      const mockFile = new File(['test content'], 'receipt.jpg', { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('receipt', mockFile);

      const request = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { 
          authorization: 'Bearer valid-token',
        },
        body: formData,
      });

      const response = await uploadReceipt(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to upload receipt');
    });

    it('should generate unique filenames for concurrent uploads', async () => {
      const mockFile1 = new File(['test content 1'], 'receipt1.jpg', { type: 'image/jpeg' });
      const mockFile2 = new File(['test content 2'], 'receipt2.jpg', { type: 'image/jpeg' });
      
      const formData1 = new FormData();
      formData1.append('receipt', mockFile1);
      
      const formData2 = new FormData();
      formData2.append('receipt', mockFile2);

      const request1 = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: formData1,
      });

      const request2 = new NextRequest('http://localhost:3000/api/expenses/upload-receipt', {
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: formData2,
      });

      const [response1, response2] = await Promise.all([
        uploadReceipt(request1),
        uploadReceipt(request2),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(data1.fileName).not.toBe(data2.fileName);
    });
  });
});