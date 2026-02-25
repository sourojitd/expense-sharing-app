import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupList from '../../../components/groups/GroupList';
import { GroupSummary } from '../../../lib/models/group';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { it } from 'zod/locales';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('GroupList', () => {
  const mockOnGroupClick = jest.fn();

  const mockGroups: GroupSummary[] = [
    {
      id: 'group-1',
      name: 'Test Group 1',
      image: 'https://example.com/image1.jpg',
      memberCount: 3,
      totalExpenses: 5,
      yourBalance: 25.50,
    },
    {
      id: 'group-2',
      name: 'Test Group 2',
      image: null,
      memberCount: 2,
      totalExpenses: 1,
      yourBalance: -15.75,
    },
    {
      id: 'group-3',
      name: 'Test Group 3',
      image: null,
      memberCount: 1,
      totalExpenses: 0,
      yourBalance: 0,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state', () => {
    render(
      <GroupList
        groups={[]}
        onGroupClick={mockOnGroupClick}
        isLoading={true}
      />
    );

    // Should show loading skeletons
    const skeletons = screen.getAllByRole('generic');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render empty state when no groups', () => {
    render(
      <GroupList
        groups={[]}
        onGroupClick={mockOnGroupClick}
        isLoading={false}
      />
    );

    expect(screen.getByText('No groups yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first group to start sharing expenses with friends.')).toBeInTheDocument();
  });

  it('should render list of groups', () => {
    render(
      <GroupList
        groups={mockGroups}
        onGroupClick={mockOnGroupClick}
        isLoading={false}
      />
    );

    expect(screen.getByText('Test Group 1')).toBeInTheDocument();
    expect(screen.getByText('Test Group 2')).toBeInTheDocument();
    expect(screen.getByText('Test Group 3')).toBeInTheDocument();
  });

  it('should display group information correctly', () => {
    render(
      <GroupList
        groups={mockGroups}
        onGroupClick={mockOnGroupClick}
        isLoading={false}
      />
    );

    // Check member count
    expect(screen.getByText('3 members')).toBeInTheDocument();
    expect(screen.getByText('2 members')).toBeInTheDocument();
    expect(screen.getByText('1 member')).toBeInTheDocument();

    // Check expense count
    expect(screen.getByText('5 expenses')).toBeInTheDocument();
    expect(screen.getByText('1 expense')).toBeInTheDocument();
    expect(screen.getByText('0 expenses')).toBeInTheDocument();
  });

  it('should display balance information correctly', () => {
    render(
      <GroupList
        groups={mockGroups}
        onGroupClick={mockOnGroupClick}
        isLoading={false}
      />
    );

    // Positive balance (you are owed)
    expect(screen.getByText('+$25.50')).toBeInTheDocument();
    expect(screen.getByText('you are owed')).toBeInTheDocument();

    // Negative balance (you owe)
    expect(screen.getByText('$15.75')).toBeInTheDocument();
    expect(screen.getByText('you owe')).toBeInTheDocument();

    // Zero balance (settled up)
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('settled up')).toBeInTheDocument();
  });

  it('should show group image when available', () => {
    render(
      <GroupList
        groups={mockGroups}
        onGroupClick={mockOnGroupClick}
        isLoading={false}
      />
    );

    const groupImage = screen.getByAltText('Test Group 1');
    expect(groupImage).toBeInTheDocument();
    expect(groupImage).toHaveAttribute('src', 'https://example.com/image1.jpg');
  });

  it('should show group initial when no image', () => {
    render(
      <GroupList
        groups={mockGroups}
        onGroupClick={mockOnGroupClick}
        isLoading={false}
      />
    );

    // Should show first letter of group name for groups without images
    const initials = screen.getAllByText('T');
    expect(initials).toHaveLength(2); // For "Test Group 2" and "Test Group 3"
  });

  it('should call onGroupClick when group is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <GroupList
        groups={mockGroups}
        onGroupClick={mockOnGroupClick}
        isLoading={false}
      />
    );

    const firstGroup = screen.getByText('Test Group 1').closest('div');
    expect(firstGroup).toBeInTheDocument();
    
    if (firstGroup) {
      await user.click(firstGroup);
      expect(mockOnGroupClick).toHaveBeenCalledWith('group-1');
    }
  });

  it('should handle multiple group clicks', async () => {
    const user = userEvent.setup();
    
    render(
      <GroupList
        groups={mockGroups}
        onGroupClick={mockOnGroupClick}
        isLoading={false}
      />
    );

    const firstGroup = screen.getByText('Test Group 1').closest('div');
    const secondGroup = screen.getByText('Test Group 2').closest('div');
    
    if (firstGroup && secondGroup) {
      await user.click(firstGroup);
      await user.click(secondGroup);
      
      expect(mockOnGroupClick).toHaveBeenCalledTimes(2);
      expect(mockOnGroupClick).toHaveBeenNthCalledWith(1, 'group-1');
      expect(mockOnGroupClick).toHaveBeenNthCalledWith(2, 'group-2');
    }
  });

  it('should have proper hover effects', () => {
    render(
      <GroupList
        groups={mockGroups}
        onGroupClick={mockOnGroupClick}
        isLoading={false}
      />
    );

    // Find the actual group container (not just the text element)
    const groupContainers = screen.getAllByRole('generic');
    const firstGroupContainer = groupContainers.find(container => 
      container.classList.contains('cursor-pointer')
    );
    
    expect(firstGroupContainer).toHaveClass('hover:shadow-md');
    expect(firstGroupContainer).toHaveClass('cursor-pointer');
  });
});