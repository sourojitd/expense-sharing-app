'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ExpenseCreateData, 
  SplitType, 
  ExpenseCategory,
} from '../../lib/models/expense';

// Form schema for expense creation
const ExpenseFormSchema = z.object({
  description: z.string().min(1, 'Description is required').max(255, 'Description too long'),
  amount: z.number().positive('Amount must be positive').max(999999.99, 'Amount too large'),
  currency: z.string().length(3, 'Currency must be 3 letters').regex(/^[A-Z]{3}$/, 'Invalid currency'),
  date: z.string().min(1, 'Date is required'),
  paidBy: z.string().uuid('Invalid payer'),
  groupId: z.string().uuid('Invalid group').optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  receipt: z.string().url('Invalid receipt URL').optional().or(z.literal('')),
  notes: z.string().max(1000, 'Notes too long').optional(),
  splitType: z.nativeEnum(SplitType),
  participants: z.array(z.object({
    userId: z.string().uuid('Invalid user ID'),
    name: z.string(),
    amount: z.number().optional(),
    percentage: z.number().min(0).max(100).optional(),
    shares: z.number().int().positive().optional(),
  })).min(1, 'At least one participant required'),
});

type ExpenseFormData = z.infer<typeof ExpenseFormSchema>;

interface User {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
}

interface Group {
  id: string;
  name: string;
  members: User[];
}

interface ExpenseCreateFormProps {
  onSubmit: (data: ExpenseCreateData & { splitType: SplitType; participants: any[] }) => Promise<void>;
  onCancel: () => void;
  users: User[];
  groups?: Group[];
  currentUserId: string;
  selectedGroupId?: string;
  isLoading?: boolean;
}

export default function ExpenseCreateForm({
  onSubmit,
  onCancel,
  users,
  groups = [],
  currentUserId,
  selectedGroupId,
  isLoading = false
}: ExpenseCreateFormProps) {
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [availableParticipants, setAvailableParticipants] = useState<User[]>(users);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
    reset,
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: {
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      paidBy: currentUserId,
      groupId: selectedGroupId,
      category: ExpenseCategory.OTHER,
      splitType: SplitType.EQUAL,
      participants: [{ userId: currentUserId, name: users.find(u => u.id === currentUserId)?.name || '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'participants',
  });

  const watchedGroupId = watch('groupId');
  const watchedSplitType = watch('splitType');
  const watchedAmount = watch('amount');
  const watchedParticipants = watch('participants');

  // Update available participants when group changes
  useEffect(() => {
    if (watchedGroupId) {
      const selectedGroup = groups.find(g => g.id === watchedGroupId);
      if (selectedGroup) {
        setAvailableParticipants(selectedGroup.members);
        // Reset participants to current user only
        reset({
          ...watch(),
          participants: [{ userId: currentUserId, name: users.find(u => u.id === currentUserId)?.name || '' }],
        });
      }
    } else {
      setAvailableParticipants(users);
    }
  }, [watchedGroupId, groups, users, currentUserId, reset, watch]);

  // Auto-calculate split amounts based on split type
  useEffect(() => {
    if (watchedAmount && watchedParticipants.length > 0) {
      const participants = [...watchedParticipants];
      
      if (watchedSplitType === SplitType.EQUAL) {
        const equalAmount = watchedAmount / participants.length;
        participants.forEach((_, index) => {
          setValue(`participants.${index}.amount`, Math.round(equalAmount * 100) / 100);
        });
      }
    }
  }, [watchedAmount, watchedParticipants.length, watchedSplitType, setValue]);

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addParticipant = (user: User) => {
    const isAlreadyAdded = watchedParticipants.some(p => p.userId === user.id);
    if (!isAlreadyAdded) {
      append({ 
        userId: user.id, 
        name: user.name,
        amount: watchedSplitType === SplitType.EQUAL ? (watchedAmount || 0) / (watchedParticipants.length + 1) : 0,
        percentage: watchedSplitType === SplitType.PERCENTAGE ? 0 : undefined,
        shares: watchedSplitType === SplitType.SHARES ? 1 : undefined,
      });
    }
  };

  const removeParticipant = (index: number) => {
    if (watchedParticipants.length > 1) {
      remove(index);
    }
  };

  const handleFormSubmit = async (data: ExpenseFormData) => {
    try {
      // Convert date string to Date object
      const formattedData = {
        ...data,
        date: new Date(data.date),
        category: data.category || ExpenseCategory.OTHER,
        receipt: receiptFile ? undefined : data.receipt || undefined, // Handle file upload separately
        splits: data.participants.map(p => ({
          userId: p.userId,
          amount: p.amount,
          percentage: p.percentage,
          shares: p.shares,
        })),
      };

      await onSubmit(formattedData as Parameters<typeof onSubmit>[0]);
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const getTotalPercentage = () => {
    return watchedParticipants.reduce((sum, p) => sum + (p.percentage || 0), 0);
  };

  const getTotalAmount = () => {
    return watchedParticipants.reduce((sum, p) => sum + (p.amount || 0), 0);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Add New Expense
        </h2>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <input
                {...register('description')}
                type="text"
                id="description"
                placeholder="What was this expense for?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <div className="flex">
                <select
                  {...register('currency')}
                  className="px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  id="amount"
                  placeholder="0.00"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                {...register('date')}
                type="date"
                id="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                {...register('category')}
                id="category"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.values(ExpenseCategory).map(category => (
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Group Selection */}
          {groups.length > 0 && (
            <div>
              <label htmlFor="groupId" className="block text-sm font-medium text-gray-700 mb-1">
                Group (Optional)
              </label>
              <select
                {...register('groupId')}
                id="groupId"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Personal Expense</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Paid By */}
          <div>
            <label htmlFor="paidBy" className="block text-sm font-medium text-gray-700 mb-1">
              Paid By *
            </label>
            <select
              {...register('paidBy')}
              id="paidBy"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableParticipants.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.id === currentUserId ? '(You)' : ''}
                </option>
              ))}
            </select>
            {errors.paidBy && (
              <p className="mt-1 text-sm text-red-600">{errors.paidBy.message}</p>
            )}
          </div>

          {/* Split Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How should this be split? *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              {Object.values(SplitType).map(type => (
                <label key={type} className="flex items-center">
                  <input
                    {...register('splitType')}
                    type="radio"
                    value={type}
                    className="mr-2"
                  />
                  <span className="text-sm capitalize">{type}</span>
                </label>
              ))}
            </div>

            {/* Participants */}
            <div className="border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium text-gray-700">Participants</h4>
                <div className="text-sm text-gray-500">
                  {watchedSplitType === SplitType.PERCENTAGE && `Total: ${getTotalPercentage()}%`}
                  {watchedSplitType === SplitType.EXACT && `Total: ${getTotalAmount().toFixed(2)}`}
                </div>
              </div>

              {/* Add Participant Dropdown */}
              <div className="mb-3">
                <select
                  onChange={(e) => {
                    const user = availableParticipants.find(u => u.id === e.target.value);
                    if (user) {
                      addParticipant(user);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>Add participant...</option>
                  {availableParticipants
                    .filter(user => !watchedParticipants.some(p => p.userId === user.id))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} {user.id === currentUserId ? '(You)' : ''}
                      </option>
                    ))}
                </select>
              </div>

              {/* Participant List */}
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{field.name}</span>
                    </div>
                    
                    {watchedSplitType === SplitType.EXACT && (
                      <input
                        {...register(`participants.${index}.amount`, { valueAsNumber: true })}
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    )}
                    
                    {watchedSplitType === SplitType.PERCENTAGE && (
                      <div className="flex items-center">
                        <input
                          {...register(`participants.${index}.percentage`, { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          placeholder="0"
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="ml-1 text-sm">%</span>
                      </div>
                    )}
                    
                    {watchedSplitType === SplitType.SHARES && (
                      <input
                        {...register(`participants.${index}.shares`, { valueAsNumber: true })}
                        type="number"
                        placeholder="1"
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    )}
                    
                    {watchedSplitType === SplitType.EQUAL && (
                      <span className="text-sm text-gray-600">
                        {watchedAmount ? (watchedAmount / watchedParticipants.length).toFixed(2) : '0.00'}
                      </span>
                    )}

                    {watchedParticipants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticipant(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Receipt Upload */}
          <div>
            <label htmlFor="receipt" className="block text-sm font-medium text-gray-700 mb-1">
              Receipt (Optional)
            </label>
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleReceiptChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                {...register('receipt')}
                type="url"
                placeholder="Or enter receipt URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {receiptPreview && (
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="w-32 h-32 object-cover border rounded"
                />
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              id="notes"
              rows={3}
              placeholder="Additional notes about this expense"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}