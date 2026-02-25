import { ProfileService } from '../../lib/services/profile.service';
import { UserRepository } from '../../lib/repositories/user.repository';
import { User } from '@prisma/client';

// Mock the UserRepository
jest.mock('../../lib/repositories/user.repository');

describe('ProfileService', () => {
  let profileService: ProfileService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockUser: User = {
    id: 'user-1',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    name: 'Test User',
    phone: '+1234567890',
    profilePicture: '/uploads/profiles/test.jpg',
    preferredCurrency: 'USD',
    emailVerified: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockUserRepository = new UserRepository() as jest.Mocked<UserRepository>;
    profileService = new ProfileService(mockUserRepository);
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const result = await profileService.getProfile('user-1');

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findUserById).toHaveBeenCalledWith('user-1');
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      const result = await profileService.getProfile('non-existent');

      expect(result).toBeNull();
      expect(mockUserRepository.findUserById).toHaveBeenCalledWith('non-existent');
    });

    it('should throw error if repository fails', async () => {
      mockUserRepository.findUserById.mockRejectedValue(new Error('Database error'));

      await expect(profileService.getProfile('user-1')).rejects.toThrow(
        'Failed to get profile: Database error'
      );
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '+9876543210',
        preferredCurrency: 'EUR',
      };
      const updatedUser = { ...mockUser, ...updateData };

      mockUserRepository.updateUser.mockResolvedValue(updatedUser);

      const result = await profileService.updateProfile('user-1', updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-1', updateData);
    });

    it('should handle partial updates', async () => {
      const updateData = { name: 'New Name' };
      const updatedUser = { ...mockUser, name: 'New Name' };

      mockUserRepository.updateUser.mockResolvedValue(updatedUser);

      const result = await profileService.updateProfile('user-1', updateData);

      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-1', { name: 'New Name' });
    });

    it('should handle empty phone number', async () => {
      const updateData = { phone: '' };
      const updatedUser = { ...mockUser, phone: null };

      mockUserRepository.updateUser.mockResolvedValue(updatedUser);

      await profileService.updateProfile('user-1', updateData);

      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-1', { phone: undefined });
    });

    it('should throw error if update fails', async () => {
      mockUserRepository.updateUser.mockRejectedValue(new Error('Update failed'));

      await expect(
        profileService.updateProfile('user-1', { name: 'New Name' })
      ).rejects.toThrow('Failed to update profile: Update failed');
    });
  });

  describe('uploadProfilePicture', () => {
    let mockFile: File;

    beforeEach(() => {
      mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB
    });

    it('should upload profile picture successfully', async () => {
      const updatedUser = { ...mockUser, profilePicture: '/uploads/profiles/profile-user-1-123456.jpg' };
      mockUserRepository.updateUser.mockResolvedValue(updatedUser);

      // Mock Date.now() for consistent filename
      const mockNow = 123456;
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const result = await profileService.uploadProfilePicture('user-1', mockFile);

      expect(result).toBe('/uploads/profiles/profile-user-1-123456.jpg');
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-1', {
        profilePicture: '/uploads/profiles/profile-user-1-123456.jpg'
      });

      Date.now = jest.fn().mockRestore();
    });

    it('should reject file that is too large', async () => {
      const largeFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
      Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 }); // 6MB

      await expect(
        profileService.uploadProfilePicture('user-1', largeFile)
      ).rejects.toThrow('Failed to upload profile picture: Profile picture must be less than 5MB');
    });

    it('should reject invalid file type', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(
        profileService.uploadProfilePicture('user-1', invalidFile)
      ).rejects.toThrow('Failed to upload profile picture: Profile picture must be a JPEG, PNG, GIF, or WebP image');
    });
  });

  describe('removeProfilePicture', () => {
    it('should remove profile picture successfully', async () => {
      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.updateUser.mockResolvedValue({ ...mockUser, profilePicture: null });

      await profileService.removeProfilePicture('user-1');

      expect(mockUserRepository.findUserById).toHaveBeenCalledWith('user-1');
      expect(mockUserRepository.updateUser).toHaveBeenCalledWith('user-1', {
        profilePicture: null
      });
    });

    it('should throw error if user not found', async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      await expect(profileService.removeProfilePicture('user-1')).rejects.toThrow(
        'Failed to remove profile picture: User not found'
      );
    });
  });

  describe('getProfileStats', () => {
    it('should return profile statistics', async () => {
      const mockStats = {
        totalExpenses: 10,
        totalGroups: 3,
        totalFriends: 5,
      };

      mockUserRepository.getUserStats.mockResolvedValue(mockStats);

      const result = await profileService.getProfileStats('user-1');

      expect(result).toEqual(mockStats);
      expect(mockUserRepository.getUserStats).toHaveBeenCalledWith('user-1');
    });

    it('should throw error if stats fetch fails', async () => {
      mockUserRepository.getUserStats.mockRejectedValue(new Error('Stats error'));

      await expect(profileService.getProfileStats('user-1')).rejects.toThrow(
        'Failed to get profile stats: Stats error'
      );
    });
  });

  describe('validateProfileData', () => {
    it('should return no errors for valid data', async () => {
      const validData = {
        name: 'Valid Name',
        phone: '+1234567890',
        preferredCurrency: 'USD',
      };

      const errors = await profileService.validateProfileData(validData);

      expect(errors).toEqual([]);
    });

    it('should return errors for invalid name', async () => {
      const invalidData = {
        name: '',
      };

      const errors = await profileService.validateProfileData(invalidData);

      expect(errors).toContain('Name is required');
    });

    it('should return errors for invalid phone', async () => {
      const invalidData = {
        phone: 'invalid-phone',
      };

      const errors = await profileService.validateProfileData(invalidData);

      expect(errors).toContain('Invalid phone number format');
    });

    it('should return errors for invalid currency', async () => {
      const invalidData = {
        preferredCurrency: 'INVALID',
      };

      const errors = await profileService.validateProfileData(invalidData);

      expect(errors).toContain('Currency code must be 3 uppercase letters');
    });

    it('should return multiple errors for multiple invalid fields', async () => {
      const invalidData = {
        name: '',
        phone: 'invalid',
        preferredCurrency: 'invalid',
      };

      const errors = await profileService.validateProfileData(invalidData);

      expect(errors).toHaveLength(3);
      expect(errors).toContain('Name is required');
      expect(errors).toContain('Invalid phone number format');
      expect(errors).toContain('Currency code must be 3 uppercase letters');
    });

    it('should allow empty phone number', async () => {
      const validData = {
        name: 'Valid Name',
        phone: '',
      };

      const errors = await profileService.validateProfileData(validData);

      expect(errors).toEqual([]);
    });
  });
});