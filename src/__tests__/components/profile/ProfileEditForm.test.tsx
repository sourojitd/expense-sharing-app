import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileEditForm } from '../../../components/profile/ProfileEditForm';
import { useAuth } from '../../../lib/contexts/auth.context';

// Mock the auth context
jest.mock('../../../lib/contexts/auth.context');

// Mock fetch
global.fetch = jest.fn();

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  phone: '+1234567890',
  profilePicture: '/uploads/profiles/test.jpg',
  preferredCurrency: 'USD',
  emailVerified: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ProfileEditForm', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();
  const mockUpdateUser = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      updateUser: mockUpdateUser,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      isLoading: false,
      error: null,
    });

    (global.fetch as jest.Mock).mockClear();
    mockOnSuccess.mockClear();
    mockOnCancel.mockClear();
    mockUpdateUser.mockClear();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
  });

  it('should render form with user data pre-filled', () => {
    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
    
    // Check that USD is selected in the dropdown
    const currencySelect = screen.getByRole('combobox', { name: /preferred currency/i });
    expect(currencySelect).toHaveValue('USD');
    
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('should display profile picture if user has one', () => {
    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const profileImage = screen.getByAltText('Profile');
    expect(profileImage).toBeInTheDocument();
    expect(profileImage).toHaveAttribute('src', '/uploads/profiles/test.jpg');
  });

  it('should display user initial if no profile picture', () => {
    mockUseAuth.mockReturnValue({
      user: { ...mockUser, profilePicture: null },
      updateUser: mockUpdateUser,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn(),
      isLoading: false,
      error: null,
    });

    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('should handle form input changes', async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/name/i);
    const phoneInput = screen.getByLabelText(/phone/i);

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    await user.clear(phoneInput);
    await user.type(phoneInput, '+9876543210');

    expect(nameInput).toHaveValue('Updated Name');
    expect(phoneInput).toHaveValue('+9876543210');
  });

  it('should handle currency selection', async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const currencySelect = screen.getByLabelText(/preferred currency/i);
    
    await user.selectOptions(currencySelect, 'EUR');

    expect(currencySelect).toHaveValue('EUR');
  });

  it('should validate file upload', async () => {
    userEvent.setup();
    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Create a large file (over 5MB)
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
      type: 'image/jpeg',
    });
    
    // Mock the file input
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(hiddenInput, 'files', {
      value: [largeFile],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText(/profile picture must be less than 5mb/i)).toBeInTheDocument();
    });
  });

  it('should validate file type', async () => {
    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Create an invalid file type
    const invalidFile = new File(['content'], 'document.pdf', {
      type: 'application/pdf',
    });

    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(hiddenInput, 'files', {
      value: [invalidFile],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);

    await waitFor(() => {
      expect(screen.getByText(/profile picture must be a jpeg, png, gif, or webp image/i)).toBeInTheDocument();
    });
  });

  it('should handle successful form submission', async () => {
    const user = userEvent.setup();
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Profile updated successfully',
        profile: { ...mockUser, name: 'Updated Name' },
      }),
    });

    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const nameInput = screen.getByLabelText(/name/i);
    const submitButton = screen.getByRole('button', { name: /save changes/i });

    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: JSON.stringify({
          name: 'Updated Name',
          phone: '+1234567890',
          preferredCurrency: 'USD',
        }),
      });
    });

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle form submission with validation errors', async () => {
    const user = userEvent.setup();
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Validation failed',
        details: ['Name is required', 'Invalid phone number'],
      }),
    });

    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Invalid phone number')).toBeInTheDocument();
    });

    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('should handle profile picture upload during form submission', async () => {
    const user = userEvent.setup();
    
    // Mock successful picture upload
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profilePictureUrl: '/uploads/profiles/new-picture.jpg',
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          profile: { ...mockUser, profilePicture: '/uploads/profiles/new-picture.jpg' },
        }),
      });

    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    // Upload a file
    const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
    const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(hiddenInput, 'files', {
      value: [validFile],
      writable: false,
    });
    
    fireEvent.change(hiddenInput);

    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/picture', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer mock-token',
        },
        body: expect.any(FormData),
      });
    });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should handle cancel button click', async () => {
    const user = userEvent.setup();
    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should handle remove profile picture', async () => {
    const user = userEvent.setup();
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Profile picture removed successfully',
      }),
    });

    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const removeButton = screen.getByText('×');
    await user.click(removeButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/profile/picture', {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer mock-token',
        },
      });
    });

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({
        ...mockUser,
        profilePicture: null,
      });
    });
  });

  it('should disable form during submission', async () => {
    const user = userEvent.setup();
    
    // Mock a slow response
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ profile: mockUser }),
      }), 1000))
    );

    render(<ProfileEditForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(submitButton);

    expect(screen.getByRole('button', { name: /saving.../i })).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeDisabled();
  });
});