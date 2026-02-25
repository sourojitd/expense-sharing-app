'use client';

import React, { useState } from 'react';
import { GroupWithMembers } from '../../lib/models/group';

interface GroupDashboardProps {
  group: GroupWithMembers;
  currentUserId: string;
  onEditGroup: () => void;
  onAddMember: () => void;
  onRemoveMember: (memberId: string) => void;
  onLeaveGroup: () => void;
  onDeleteGroup: () => void;
  onTransferOwnership: (newOwnerId: string) => void;
}

export default function GroupDashboard({
  group,
  currentUserId,
  onEditGroup,
  onAddMember,
  onRemoveMember,
  onLeaveGroup,
  onDeleteGroup,
  onTransferOwnership,
}: GroupDashboardProps) {
  const [showMemberActions, setShowMemberActions] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const isCreator = group.createdBy === currentUserId;
  const currentUserMember = group.members.find(m => m.userId === currentUserId);
  const isAdmin = currentUserMember?.role === 'admin';
  const canManage = isCreator || isAdmin;

  const handleMemberAction = (memberId: string, action: 'remove' | 'makeAdmin' | 'makeMember') => {
    if (action === 'remove') {
      onRemoveMember(memberId);
    }
    // TODO: Implement role changes
    setShowMemberActions(null);
  };

  const handleTransferOwnership = (newOwnerId: string) => {
    onTransferOwnership(newOwnerId);
    setShowTransferModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Group Header */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {group.image ? (
              <img
                src={group.image}
                alt={group.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold text-2xl">
                  {group.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              {group.description && (
                <p className="text-gray-600 mt-1">{group.description}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Created by {group.creator.name} • {group.members.length + 1} members
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {canManage && (
              <>
                <button
                  onClick={onEditGroup}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Edit Group
                </button>
                <button
                  onClick={onAddMember}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Member
                </button>
              </>
            )}
            
            {/* More Actions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMemberActions(showMemberActions ? null : 'menu')}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
              
              {showMemberActions === 'menu' && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <div className="py-1">
                    {!isCreator && (
                      <button
                        onClick={onLeaveGroup}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Leave Group
                      </button>
                    )}
                    {isCreator && (
                      <>
                        <button
                          onClick={() => setShowTransferModal(true)}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          Transfer Ownership
                        </button>
                        <button
                          onClick={onDeleteGroup}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          Delete Group
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Members</h2>
        
        <div className="space-y-3">
          {/* Creator */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-3">
              {group.creator.profilePicture ? (
                <img
                  src={group.creator.profilePicture}
                  alt={group.creator.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                  <span className="text-blue-800 font-semibold">
                    {group.creator.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {group.creator.name}
                  {group.creator.id === currentUserId && ' (You)'}
                </p>
                <p className="text-sm text-gray-600">{group.creator.email}</p>
              </div>
            </div>
            <span className="px-2 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full">
              Creator
            </span>
          </div>

          {/* Members */}
          {group.members.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3">
                {member.user.profilePicture ? (
                  <img
                    src={member.user.profilePicture}
                    alt={member.user.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-700 font-semibold">
                      {member.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {member.user.name}
                    {member.userId === currentUserId && ' (You)'}
                  </p>
                  <p className="text-sm text-gray-600">{member.user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  member.role === 'admin' 
                    ? 'text-purple-800 bg-purple-100' 
                    : 'text-gray-800 bg-gray-100'
                }`}>
                  {member.role}
                </span>
                
                {canManage && member.userId !== currentUserId && (
                  <div className="relative">
                    <button
                      onClick={() => setShowMemberActions(
                        showMemberActions === member.id ? null : member.id
                      )}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                    
                    {showMemberActions === member.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => handleMemberAction(member.userId, 'remove')}
                            className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Ownership Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Transfer Ownership</h3>
            <p className="text-gray-600 mb-4">
              Select a member to transfer ownership to. You will become an admin member.
            </p>
            
            <div className="space-y-2 mb-6">
              {group.members.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleTransferOwnership(member.userId)}
                  className="w-full flex items-center space-x-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  {member.user.profilePicture ? (
                    <img
                      src={member.user.profilePicture}
                      alt={member.user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-700 font-semibold text-sm">
                        {member.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{member.user.name}</p>
                    <p className="text-sm text-gray-600">{member.user.email}</p>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}