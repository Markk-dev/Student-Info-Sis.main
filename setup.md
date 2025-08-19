# Setup Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Create Environment File**
   Create a `.env` file in the root directory with:
   ```env
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=your-project-id
   VITE_DATABASE_ID=university_canteen_db
   VITE_COLLECTION_STUDENTS=students
   VITE_COLLECTION_ADMINS=admins
   VITE_COLLECTION_TRANSACTIONS=transactions
   VITE_COLLECTION_PRODUCTS=products
   VITE_COLLECTION_ORDERS=orders
   VITE_COLLECTION_SETTINGS=settings
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

## Appwrite Setup

### 1. Create Appwrite Project
- Go to [cloud.appwrite.io](https://cloud.appwrite.io)
- Create a new project
- Note your Project ID

### 2. Create Database
- In your Appwrite console, go to Databases
- Create a new database named `university_canteen_db`

### 3. Create Collections

#### Students Collection
```json
{
  "studentId": "string",
  "firstName": "string", 
  "lastName": "string",
  "email": "string",
  "course": "string",
  "yearLevel": "string",
  "balance": "number",
  "isActive": "boolean",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Admins Collection
```json
{
  "username": "string",
  "email": "string",
  "role": "string",
  "isActive": "boolean",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Transactions Collection
```json
{
  "studentId": "string",
  "amount": "number",
  "type": "string",
  "items": "string[]",
  "cashierId": "string",
  "notes": "string",
  "createdAt": "string"
}
```

#### Products Collection
```json
{
  "name": "string",
  "description": "string",
  "price": "number",
  "category": "string",
  "isAvailable": "boolean",
  "stock": "number",
  "imageUrl": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Orders Collection
```json
{
  "studentId": "string",
  "items": "object[]",
  "totalAmount": "number",
  "status": "string",
  "cashierId": "string",
  "notes": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### Settings Collection
```json
{
  "canteenName": "string",
  "operatingHours": "object",
  "maxDailySpend": "number",
  "currency": "string",
  "taxRate": "number",
  "updatedAt": "string"
}
```

### 4. Set Permissions
For each collection, set the following permissions:
- **Read**: Any authenticated user
- **Write**: Any authenticated user
- **Delete**: Any authenticated user

### 5. Update Configuration
Update `src/lib/appwrite.ts` with your project details:
```typescript
const client = new Client()
    .setEndpoint('https://cloud.appwrite.io/v1')
    .setProject('your-actual-project-id');
```

## Testing the Setup

1. **Start the application**: `npm run dev`
2. **Test Admin Login**: Use any username/password (mock login)
3. **Test Student Login**: Use any student ID/last name (mock login)

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Run `npm install` to install dependencies
   - Check that all packages are installed correctly

2. **Appwrite connection errors**
   - Verify your Project ID is correct
   - Check that your database and collections exist
   - Ensure permissions are set correctly

3. **Build errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript configuration

### Support
- Check the [Appwrite documentation](https://appwrite.io/docs)
- Review the project README.md
- Create an issue in the repository 