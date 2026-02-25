'use client';

import React, { useState, useEffect } from 'react';

interface FriendRequestWithUsers {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  receiver: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
}

interface FriendRequestsProps {
  type: 'received' | 'sent';
  onRequestUpdate?: () => void;
}

export function FriendRequests({ type, onRequestUpdate }: FriendRequestsProps): React.JSX.Element {
  const [requests, setRequests] = useState<FriendRequestWithUsers[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, [type]);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/friends/requests?type=${type}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch friend requests');
      }

      const data = await response.json();
      setRequests(data.requests);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load friend requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (!response.ok) {
        throw new Error('Failed to accept friend request');
      }

      // Remove request from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      if (onRequestUpdate) {
        onRequestUpdate();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject friend request');
      }

      // Remove request from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      if (onRequestUpdate) {
        onRequestUpdate();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to reject friend request');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/friends/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel friend request');
      }

      // Remove request from local state
      setRequests(prev => prev.filter(req => req.id !== requestId));
      
      if (onRequestUpdate) {
        onRequestUpdate();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel friend request');
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

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>
          {type === 'received' 
            ? 'No pending friend requests' 
            : 'No sent friend requests'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">
        {type === 'received' ? 'Friend Requests' : 'Sent Requests'} ({requests.length})
      </h3>
      
      <div className="space-y-2">
        {requests.map((request) => {
          const user = type === 'received' ? request.sender : request.receiver;
          
          return (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-center space-x-3">
                {user.profilePicture ? (
                  <img
                    src={user.profilePicture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-600 font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-gray-900">{user.name}</h4>
                  <p className="text-sm text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {type === 'received' ? (
                  <>
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleCancelRequest(request.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}