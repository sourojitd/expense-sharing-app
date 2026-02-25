'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface UserWithStatus {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  friendshipStatus: 'friend' | 'pending_sent' | 'pending_received' | 'none';
  friendRequestId?: string;
}

interface UserSearchProps {
  onFriendRequestSent?: () => void;
}

export function UserSearch({ onFriendRequestSent }: UserSearchProps): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserWithStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setUsers([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to search users');
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(query);
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [query, searchUsers]);

  const handleSendFriendRequest = async (userId: string) => {
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ receiverId: userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send friend request');
      }

      // Update user status in local state
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, friendshipStatus: 'pending_sent' as const }
          : user
      ));

      if (onFriendRequestSent) {
        onFriendRequestSent();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send friend request');
    }
  };

  const getActionButton = (user: UserWithStatus) => {
    switch (user.friendshipStatus) {
      case 'friend':
        return (
          <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded">
            Friends
          </span>
        );
      case 'pending_sent':
        return (
          <span className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded">
            Request Sent
          </span>
        );
      case 'pending_received':
        return (
          <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">
            Pending Response
          </span>
        );
      case 'none':
        return (
          <button
            onClick={() => handleSendFriendRequest(user.id)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Add Friend
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="userSearch" className="block text-sm font-medium text-gray-700 mb-2">
          Search for friends
        </label>
        <input
          type="text"
          id="userSearch"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center items-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {query.trim().length >= 2 && !isLoading && users.length === 0 && !error && (
        <div className="text-center py-4 text-gray-500">
          No users found matching &quot;{query}&quot;
        </div>
      )}

      {users.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Search Results</h4>
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center space-x-3">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                <div>
                  <h5 className="font-medium text-gray-900 text-sm">{user.name}</h5>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>

              {getActionButton(user)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}