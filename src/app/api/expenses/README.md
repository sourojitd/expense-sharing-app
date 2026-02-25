# Expense API Endpoints

This document describes the expense management API endpoints that have been implemented.

## Base URL
All endpoints are prefixed with `/api/expenses`

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Expense CRUD Operations

#### GET /api/expenses
Get expenses with optional filters.

**Query Parameters:**
- `groupId` (optional): Filter by group ID
- `userId` (optional): Filter by user ID
- `category` (optional): Filter by expense category
- `dateFrom` (optional): Filter expenses from this date
- `dateTo` (optional): Filter expenses to this date
- `settled` (optional): Filter by settlement status (true/false)
- `limit` (optional): Limit number of results (default: 50)
- `offset` (optional): Offset for pagination (default: 0)

**Response:**
```json
{
  "expenses": [
    {
      "id": "uuid",
      "description": "string",
      "amount": "number",
      "currency": "string",
      "date": "date",
      "paidBy": "uuid",
      "groupId": "uuid",
      "category": "string",
      "receipt": "string",
      "notes": "string",
      "splits": [...],
      "payer": {...},
      "group": {...}
    }
  ]
}
```

#### POST /api/expenses
Create a new expense.

**Request Body:**
```json
{
  "description": "string",
  "amount": "number",
  "currency": "string",
  "date": "string (ISO date)",
  "paidBy": "uuid",
  "groupId": "uuid (optional)",
  "category": "string (optional)",
  "receipt": "string (optional)",
  "notes": "string (optional)",
  "splitType": "equal|exact|percentage|shares",
  "participants": [
    {
      "userId": "uuid",
      "amount": "number (for exact split)",
      "percentage": "number (for percentage split)",
      "shares": "number (for shares split)"
    }
  ]
}
```

#### GET /api/expenses/[expenseId]
Get a specific expense by ID.

#### PUT /api/expenses/[expenseId]
Update an existing expense.

#### DELETE /api/expenses/[expenseId]
Delete an expense.

### 2. File Upload

#### POST /api/expenses/upload-receipt
Upload a receipt file for an expense.

**Request:** Multipart form data with `receipt` field
**Supported formats:** JPEG, PNG, GIF, PDF
**Max file size:** 5MB

**Response:**
```json
{
  "message": "Receipt uploaded successfully",
  "url": "/uploads/receipts/filename.jpg",
  "fileName": "filename.jpg"
}
```

### 3. Expense Splits Management

#### GET /api/expenses/[expenseId]/splits
Get all splits for a specific expense.

#### POST /api/expenses/splits/[splitId]/settle
Mark an expense split as settled.

#### DELETE /api/expenses/splits/[splitId]/settle
Mark an expense split as unsettled.

### 4. User-Specific Endpoints

#### GET /api/expenses/user
Get expenses for the authenticated user.

**Query Parameters:** Same as GET /api/expenses (except userId)

#### GET /api/expenses/user/splits
Get splits for the authenticated user.

**Query Parameters:**
- `settled` (optional): Filter by settlement status (true/false)

### 5. Analytics and Summary

#### GET /api/expenses/summary
Get expense summary and analytics.

**Query Parameters:** Same as GET /api/expenses

**Response:**
```json
{
  "summary": {
    "totalExpenses": "number",
    "totalAmount": "number",
    "currency": "string",
    "categoryBreakdown": {
      "category": "amount"
    },
    "monthlyTrend": [
      {
        "month": "YYYY-MM",
        "amount": "number"
      }
    ]
  }
}
```

## Split Types

### Equal Split
Divides the total amount equally among all participants.

### Exact Split
Each participant pays a specific amount. The sum must equal the total expense amount.

### Percentage Split
Each participant pays a percentage of the total. Percentages must sum to 100%.

### Shares Split
Each participant has a number of shares. The amount is divided proportionally based on shares.

## Error Responses

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

Error response format:
```json
{
  "error": "Error message"
}
```

## Validation Rules

### Expense Creation
- Description: Required, max 255 characters
- Amount: Required, positive number, max 999,999.99
- Currency: Required, 3-letter uppercase code
- Date: Required, cannot be in the future
- PaidBy: Required, valid UUID
- GroupId: Optional, valid UUID
- Category: Optional, valid expense category
- Receipt: Optional, valid URL
- Notes: Optional, max 1000 characters

### Split Validation
- At least one participant required
- All participants must be valid users
- For group expenses, all participants must be group members
- Split amounts/percentages must be valid for the chosen split type

## Security Features

- JWT token authentication required for all endpoints
- User can only access expenses they are involved in
- Group membership validation for group expenses
- File upload validation (type and size limits)
- Input sanitization and validation
- Access control for expense modifications

## File Storage

Receipt files are stored in the `public/uploads/receipts/` directory with the naming pattern:
`receipt_{userId}_{timestamp}.{extension}`

Files are accessible via the public URL: `/uploads/receipts/{filename}`