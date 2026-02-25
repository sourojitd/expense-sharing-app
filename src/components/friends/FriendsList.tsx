'use client';

import React, { useState, useEffect } from 'react';
import { User } from '@prisma/client';

interface FriendsListProps {
  onRemoveFriend?: (friendId: string) => void;
}

export function FriendsList({ onRemoveFriend }: FriendsListProps): React.JSX.Element {
  const [friends, setFriends] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/friends', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch friends');
      }

      const data = await response.json();
      setFriends(data.friends);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove friend');
      }

      // Remove friend from local state
      setFriends(prev => prev.filter(friend => friend.id !== friendId));
      
      if (onRemoveFriend) {
        onRemoveFriend(friendId);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove friend');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No friends yet. Start by searching for people to add!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">
        Friends ({friends.length})
      </h3>
      
      <div className="space-y-2">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-center space-x-3">
              {friend.profilePicture ? (
                <img
                  src={friend.profilePicture}
                  alt={friend.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-600 font-medium">
                    {friend.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-gray-900">{friend.name}</h4>
                <p className="text-sm text-gray-500">{friend.email}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleRemoveFriend(friend.id)}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}