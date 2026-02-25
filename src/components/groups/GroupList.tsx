'use client';

import React from 'react';
import { GroupSummary } from '../../lib/models/group';

interface GroupListProps {
  groups: GroupSummary[];
  onGroupClick: (groupId: string) => void;
  isLoading?: boolean;
}

export default function GroupList({ groups, onGroupClick, isLoading = false }: GroupListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No groups yet</h3>
        <p className="text-gray-500">Create your first group to start sharing expenses with friends.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div
          key={group.id}
          onClick={() => onGroupClick(group.id)}
          className="bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300"
        >
          <div className="flex items-center space-x-4">
            {/* Group Image */}
            <div className="flex-shrink-0">
              {group.image ? (
                <img
                  src={group.image}
                  alt={group.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-lg">
                    {group.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Group Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-medium text-gray-900 truncate">
                {group.name}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                </span>
                <span className="flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {group.totalExpenses} {group.totalExpenses === 1 ? 'expense' : 'expenses'}
                </span>
              </div>
            </div>

            {/* Balance */}
            <div className="flex-shrink-0 text-right">
              <div className={`text-lg font-semibold ${
                group.yourBalance > 0 
                  ? 'text-green-600' 
                  : group.yourBalance < 0 
                    ? 'text-red-600' 
                    : 'text-gray-600'
              }`}>
                {group.yourBalance > 0 && '+'}
                ${Math.abs(group.yourBalance).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                {group.yourBalance > 0 
                  ? 'you are owed' 
                  : group.yourBalance < 0 
                    ? 'you owe' 
                    : 'settled up'
                }
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}