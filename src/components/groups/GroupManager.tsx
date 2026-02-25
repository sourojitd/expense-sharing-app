'use client';

import React, { useState, useEffect } from 'react';
import { GroupSummary, GroupWithMembers, CreateGroupData } from '../../lib/models/group';
import GroupList from './GroupList';
import GroupCreateForm from './GroupCreateForm';
import GroupDashboard from './GroupDashboard';

interface GroupManagerProps {
  currentUserId: string;
}

export default function GroupManager({ currentUserId }: GroupManagerProps) {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user groups
  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      const url = searchQuery 
        ? `/api/groups?search=${encodeURIComponent(searchQuery)}`
        : '/api/groups';
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGroups(data.groups);
      } else {
        console.error('Failed to fetch groups');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch group details
  const fetchGroupDetails = async (groupId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedGroup(data.group);
      } else {
        console.error('Failed to fetch group details');
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
    }
  };

  // Create new group
  const handleCreateGroup = async (groupData: CreateGroupData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(groupData),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateForm(false);
        await fetchGroups(); // Refresh the list
        await fetchGroupDetails(data.group.id); // Show the new group
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert(error instanceof Error ? error.message : 'Failed to create group');
    } finally {
      setIsLoading(false);
    }
  };

  // Add member to group
  const handleAddMember = async () => {
    // TODO: Implement add member modal
    console.log('Add member functionality to be implemented');
  };

  // Remove member from group
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedGroup) return;

    if (confirm('Are you sure you want to remove this member?')) {
      try {
        const response = await fetch(`/api/groups/${selectedGroup.id}/members/${memberId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.ok) {
          await fetchGroupDetails(selectedGroup.id); // Refresh group details
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to remove member');
        }
      } catch (error) {
        console.error('Error removing member:', error);
        alert(error instanceof Error ? error.message : 'Failed to remove member');
      }
    }
  };

  // Leave group
  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;

    if (confirm('Are you sure you want to leave this group?')) {
      try {
        const response = await fetch(`/api/groups/${selectedGroup.id}/leave`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.ok) {
          setSelectedGroup(null);
          await fetchGroups(); // Refresh the list
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to leave group');
        }
      } catch (error) {
        console.error('Error leaving group:', error);
        alert(error instanceof Error ? error.message : 'Failed to leave group');
      }
    }
  };

  // Delete group
  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        const response = await fetch(`/api/groups/${selectedGroup.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });

        if (response.ok) {
          setSelectedGroup(null);
          await fetchGroups(); // Refresh the list
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete group');
        }
      } catch (error) {
        console.error('Error deleting group:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete group');
      }
    }
  };

  // Transfer ownership
  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}/transfer-ownership`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ newOwnerId }),
      });

      if (response.ok) {
        await fetchGroupDetails(selectedGroup.id); // Refresh group details
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transfer ownership');
      }
    } catch (error) {
      console.error('Error transferring ownership:', error);
      alert(error instanceof Error ? error.message : 'Failed to transfer ownership');
    }
  };

  // Edit group
  const handleEditGroup = () => {
    // TODO: Implement edit group modal
    console.log('Edit group functionality to be implemented');
  };

  // Search groups
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Load groups on component mount and when search changes
  useEffect(() => {
    fetchGroups();
  }, [searchQuery]);

  if (showCreateForm) {
    return (
      <GroupCreateForm
        onSubmit={handleCreateGroup}
        onCancel={() => setShowCreateForm(false)}
        isLoading={isLoading}
      />
    );
  }

  if (selectedGroup) {
    return (
      <div>
        <div className="mb-4">
          <button
            onClick={() => setSelectedGroup(null)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Groups
          </button>
        </div>
        
        <GroupDashboard
          group={selectedGroup}
          currentUserId={currentUserId}
          onEditGroup={handleEditGroup}
          onAddMember={handleAddMember}
          onRemoveMember={handleRemoveMember}
          onLeaveGroup={handleLeaveGroup}
          onDeleteGroup={handleDeleteGroup}
          onTransferOwnership={handleTransferOwnership}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Create Group
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Groups List */}
      <GroupList
        groups={groups}
        onGroupClick={fetchGroupDetails}
        isLoading={isLoading}
      />
    </div>
  );
}