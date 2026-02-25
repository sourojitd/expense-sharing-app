import { UserRepository } from '../repositories/user.repository';
import { UpdateUserInput } from '../models/user';
import { User } from '@prisma/client';
import { StorageService } from './storage.service';

export interface ProfileUpdateData {
  name?: string;
  phone?: string;
  preferredCurrency?: string;
  profilePicture?: string;
}

export interface ProfilePictureUpload {
  file: File;
  userId: string;
}

export class ProfileService {
  private userRepository: UserRepository;
  private storageService: StorageService;

  constructor(userRepository?: UserRepository) {
    this.userRepository = userRepository || new UserRepository();
    this.storageService = new StorageService();
  }

  async getProfile(userId: string): Promise<User | null> {
    try {
      return await this.userRepository.findUserById(userId);
    } catch (error) {
      throw new Error(`Failed to get profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateProfile(userId: string, profileData: ProfileUpdateData): Promise<User> {
    try {
      // Validate the update data
      const updateData: UpdateUserInput = {};
      
      if (profileData.name !== undefined) {
        updateData.name = profileData.name;
      }
      
      if (profileData.phone !== undefined) {
        updateData.phone = profileData.phone || undefined;
      }
      
      if (profileData.preferredCurrency !== undefined) {
        updateData.preferredCurrency = profileData.preferredCurrency;
      }
      
      if (profileData.profilePicture !== undefined) {
        updateData.profilePicture = profileData.profilePicture;
      }

      return await this.userRepository.updateUser(userId, updateData);
    } catch (error) {
      throw new Error(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadProfilePicture(userId: string, file: File): Promise<string> {
    try {
      // Validate file type and size
      this.validateProfilePicture(file);

      // Delete old profile picture if it exists
      const user = await this.userRepository.findUserById(userId);
      if (user?.profilePicture) {
        await this.storageService.deleteFile(user.profilePicture);
      }

      // Save file using StorageService
      const profilePictureUrl = await this.storageService.saveFile(file, 'profiles', userId);

      // Update user's profile picture URL in database
      await this.userRepository.updateUser(userId, {
        profilePicture: profilePictureUrl
      });

      return profilePictureUrl;
    } catch (error) {
      throw new Error(`Failed to upload profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async removeProfilePicture(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Remove the profile picture URL from database
      await this.userRepository.updateUser(userId, {
        profilePicture: null
      });

      // Delete the file from storage
      if (user.profilePicture) {
        await this.storageService.deleteFile(user.profilePicture);
      }
    } catch (error) {
      throw new Error(`Failed to remove profile picture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private validateProfilePicture(file: File): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (file.size > maxSize) {
      throw new Error('Profile picture must be less than 5MB');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Profile picture must be a JPEG, PNG, GIF, or WebP image');
    }
  }

  async getProfileStats(userId: string): Promise<{
    totalExpenses: number;
    totalGroups: number;
    totalFriends: number;
  }> {
    try {
      return await this.userRepository.getUserStats(userId);
    } catch (error) {
      throw new Error(`Failed to get profile stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateProfileData(profileData: ProfileUpdateData): Promise<string[]> {
    const errors: string[] = [];

    if (profileData.name !== undefined) {
      if (!profileData.name.trim()) {
        errors.push('Name is required');
      } else if (profileData.name.length > 255) {
        errors.push('Name must be less than 255 characters');
      } else if (!/^[a-zA-Z\s]+$/.test(profileData.name)) {
        errors.push('Name can only contain letters and spaces');
      }
    }

    if (profileData.phone !== undefined && profileData.phone.trim()) {
      if (!/^\+?[1-9]\d{1,14}$/.test(profileData.phone)) {
        errors.push('Invalid phone number format');
      }
    }

    if (profileData.preferredCurrency !== undefined) {
      if (!/^[A-Z]{3}$/.test(profileData.preferredCurrency)) {
        errors.push('Currency code must be 3 uppercase letters');
      }
    }

    return errors;
  }
}