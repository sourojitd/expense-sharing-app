'use client';

import React, { useState, useRef } from 'react';

interface ContactData {
  name: string;
  email?: string;
  phone?: string;
}

interface ImportedContact extends ContactData {
  isRegistered: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
}

interface ContactImportResult {
  totalContacts: number;
  registeredUsers: ImportedContact[];
  unregisteredContacts: ImportedContact[];
  invalidContacts: { contact: ContactData; errors: string[] }[];
}

interface ContactImportProps {
  onFriendRequestSent?: () => void;
}

export function ContactImport({ onFriendRequestSent }: ContactImportProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ContactImportResult | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'vcard'>('csv');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('contactFile', file);
      formData.append('format', selectedFormat);

      const response = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to import contacts');
      }

      const data = await response.json();
      setImportResult(data.result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import contacts');
    } finally {
      setIsLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

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

      // Update the contact in the result to show request sent
      if (importResult) {
        setImportResult({
          ...importResult,
          registeredUsers: importResult.registeredUsers.map(contact =>
            contact.user?.id === userId
              ? { ...contact, requestSent: true }
              : contact
          ) as any,
        });
      }

      if (onFriendRequestSent) {
        onFriendRequestSent();
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to send friend request');
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Import Contacts
        </h3>
        
        <p className="text-sm text-gray-600 mb-4">
          Upload your contacts file to find friends who are already using the app.
        </p>

        {/* Format Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            File Format
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="csv"
                checked={selectedFormat === 'csv'}
                onChange={(e) => setSelectedFormat(e.target.value as 'csv')}
                className="mr-2"
              />
              CSV
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="vcard"
                checked={selectedFormat === 'vcard'}
                onChange={(e) => setSelectedFormat(e.target.value as 'vcard')}
                className="mr-2"
              />
              vCard (.vcf)
            </label>
          </div>
        </div>

        {/* File Upload */}
        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept={selectedFormat === 'csv' ? '.csv' : '.vcf'}
            onChange={handleFileUpload}
            className="hidden"
            disabled={isLoading}
          />
          
          <button
            onClick={handleTriggerFileInput}
            disabled={isLoading}
            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Processing...
              </div>
            ) : (
              `Choose ${selectedFormat.toUpperCase()} file`
            )}
          </button>
        </div>

        {/* Format Instructions */}
        <div className="text-xs text-gray-500">
          {selectedFormat === 'csv' ? (
            <p>CSV should have columns: Name, Email, Phone (headers required)</p>
          ) : (
            <p>vCard files exported from contacts apps are supported</p>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Import Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {importResult.totalContacts}
                </div>
                <div className="text-blue-700">Total Contacts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {importResult.registeredUsers.length}
                </div>
                <div className="text-green-700">On Platform</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {importResult.unregisteredContacts.length}
                </div>
                <div className="text-gray-700">Not Registered</div>
              </div>
            </div>
          </div>

          {/* Registered Users */}
          {importResult.registeredUsers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">
                Friends Found ({importResult.registeredUsers.length})
              </h4>
              <div className="space-y-2">
                {importResult.registeredUsers.map((contact, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      {contact.user?.profilePicture ? (
                        <img
                          src={contact.user.profilePicture}
                          alt={contact.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-600 text-sm font-medium">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      
                      <div>
                        <h5 className="font-medium text-gray-900 text-sm">
                          {contact.user?.name || contact.name}
                        </h5>
                        <p className="text-xs text-gray-500">
                          {contact.user?.email || contact.email}
                        </p>
                      </div>
                    </div>

                    {contact.user && !(contact as any).requestSent && (
                      <button
                        onClick={() => handleSendFriendRequest(contact.user!.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Add Friend
                      </button>
                    )}

                    {(contact as any).requestSent && (
                      <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded">
                        Request Sent
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invalid Contacts */}
          {importResult.invalidContacts.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-800 mb-3">
                Invalid Contacts ({importResult.invalidContacts.length})
              </h4>
              <div className="space-y-2">
                {importResult.invalidContacts.map((item, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-medium">{item.contact.name}</span>
                    <span className="text-yellow-700 ml-2">
                      - {item.errors.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}