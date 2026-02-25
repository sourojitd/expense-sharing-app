import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupCreateForm from '../../../components/groups/GroupCreateForm';

describe('GroupCreateForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render form with all fields', () => {
    render(
      <GroupCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Create New Group')).toBeInTheDocument();
    expect(screen.getByLabelText('Group Name *')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Group Image URL (Optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Group' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <GroupCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(
      <GroupCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Group Name *');
    const descriptionInput = screen.getByLabelText('Description (Optional)');
    const submitButton = screen.getByRole('button', { name: 'Create Group' });

    await user.type(nameInput, 'Test Group');
    await user.type(descriptionInput, 'A test group description');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Test Group',
        description: 'A test group description',
      });
    });
  });

  it('should show validation error for empty name', async () => {
    const user = userEvent.setup();
    
    render(
      <GroupCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Create Group' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Group name is required')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show validation error for name too long', async () => {
    const user = userEvent.setup();
    
    render(
      <GroupCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Group Name *');
    const submitButton = screen.getByRole('button', { name: 'Create Group' });

    await user.type(nameInput, 'a'.repeat(101)); // Too long
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Group name must be less than 100 characters')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show validation error for invalid image URL', async () => {
    const user = userEvent.setup();
    
    render(
      <GroupCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Group Name *');
    const imageInput = screen.getByLabelText('Group Image URL (Optional)');
    const submitButton = screen.getByRole('button', { name: 'Create Group' });

    await user.type(nameInput, 'Test Group');
    await user.type(imageInput, 'not-a-url');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid image URL')).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show image preview when valid URL is entered', async () => {
    const user = userEvent.setup();
    
    render(
      <GroupCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const imageInput = screen.getByLabelText('Group Image URL (Optional)');
    await user.type(imageInput, 'https://example.com/image.jpg');

    await waitFor(() => {
      const previewImage = screen.getByAltText('Group preview');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', 'https://example.com/image.jpg');
    });
  });

  it('should disable buttons when loading', () => {
    render(
      <GroupCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isLoading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: 'Creating...' });
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should submit form with only required fields', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(
      <GroupCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const nameInput = screen.getByLabelText('Group Name *');
    const submitButton = screen.getByRole('button', { name: 'Create Group' });

    await user.type(nameInput, 'Minimal Group');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        name: 'Minimal Group',
      });
    });
  });
});