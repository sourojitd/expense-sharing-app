'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/contexts/auth.context';
import { ChangePasswordForm } from './ChangePasswordForm';
import { ProfileEditForm } from '../profile/ProfileEditForm';

interface ProfileStats {
  totalExpenses: number;
  totalGroups: number;
  totalFriends: number;
}

export function UserProfile(): React.JSX.Element {
  const { user, logout } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    fetchProfileStats();
  }, []);

  const fetchProfileStats = async () => {
    try {
      const response = await fetch('/api/profile/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfileStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch profile stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleChangePasswordSuccess = () => {
    setShowChangePassword(false);
  };

  const handleEditProfileSuccess = () => {
    setShowEditProfile(false);
    fetchProfileStats(); // Refresh stats after profile update
  };

  if (showChangePassword) {
    return (
      <ChangePasswordForm
        onSuccess={handleChangePasswordSuccess}
        onCancel={() => setShowChangePassword(false)}
      />
    );
  }

  if (showEditProfile) {
    return (
      <ProfileEditForm
        onSuccess={handleEditProfileSuccess}
        onCancel={() => setShowEditProfile(false)}
      />
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Profile
        </h2>

        {/* Profile Picture and Basic Info */}
        <div className="text-center mb-6">
          {user.profilePicture ? (
            <img
              src={user.profilePicture}
              alt="Profile"
              className="w-20 h-20 rounded-full object-cover border-4 border-gray-200 mx-auto mb-3"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
              <span className="text-gray-500 text-2xl">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
          {!user.emailVerified && (
            <p className="text-sm text-orange-600 mt-1">
              Email not verified
            </p>
          )}
        </div>

        {/* Profile Stats */}
        {!isLoadingStats && profileStats && (
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{profileStats.totalExpenses}</div>
              <div className="text-xs text-gray-600">Expenses</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{profileStats.totalGroups}</div>
              <div className="text-xs text-gray-600">Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{profileStats.totalFriends}</div>
              <div className="text-xs text-gray-600">Friends</div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {user.phone && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
                {user.phone}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preferred Currency
            </label>
            <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
              {user.preferredCurrency}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <p className="text-gray-900 bg-gray-50 px-3 py-2 rounded-md">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => setShowEditProfile(true)}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Edit Profile
          </button>

          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Change Password
          </button>

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}