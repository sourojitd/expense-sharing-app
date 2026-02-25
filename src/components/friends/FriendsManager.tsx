'use client';

import React, { useState } from 'react';
import { FriendsList } from './FriendsList';
import { FriendRequests } from './FriendRequests';
import { UserSearch } from './UserSearch';
import { ContactImport } from './ContactImport';

type TabType = 'friends' | 'requests' | 'search' | 'import';

export function FriendsManager(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const tabs = [
    { id: 'friends' as TabType, label: 'Friends', icon: '👥' },
    { id: 'requests' as TabType, label: 'Requests', icon: '📬' },
    { id: 'search' as TabType, label: 'Search', icon: '🔍' },
    { id: 'import' as TabType, label: 'Import', icon: '📋' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'friends' && (
            <FriendsList 
              key={`friends-${refreshKey}`}
              onRemoveFriend={handleRefresh}
            />
          )}
          
          {activeTab === 'requests' && (
            <div className="space-y-8">
              <FriendRequests 
                key={`received-${refreshKey}`}
                type="received" 
                onRequestUpdate={handleRefresh}
              />
              <FriendRequests 
                key={`sent-${refreshKey}`}
                type="sent" 
                onRequestUpdate={handleRefresh}
              />
            </div>
          )}
          
          {activeTab === 'search' && (
            <UserSearch 
              key={`search-${refreshKey}`}
              onFriendRequestSent={handleRefresh}
            />
          )}
          
          {activeTab === 'import' && (
            <ContactImport 
              key={`import-${refreshKey}`}
              onFriendRequestSent={handleRefresh}
            />
          )}
        </div>
      </div>
    </div>
  );
}