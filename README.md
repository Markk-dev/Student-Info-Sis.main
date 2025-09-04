# University Canteen Management System

A modern React-based management system for university canteens with separate interfaces for administrators and students.

## 🚀 Features

- **Dual User Interface**: Separate dashboards for administrators and students
- **Real-time Analytics**: Comprehensive reporting and data visualization
- **Transaction Management**: Track purchases, refunds, and deposits
- **Student Management**: Complete student registration and profile management
- **Product Catalog**: Manage canteen products and inventory
- **Barcode Scanning**: Quick transaction processing
- **Responsive Design**: Mobile-friendly interface
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Database**: Appwrite (Backend as a Service)
- **Authentication**: Appwrite Auth

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd university-canteen-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Appwrite**
   - Create an Appwrite project at [cloud.appwrite.io](https://cloud.appwrite.io)
   - Get your Project ID and Endpoint URL
   - Update the configuration in `src/lib/appwrite.ts`

4. **Configure Appwrite Database**
   - Create a database named `university_canteen_db`
   - Create the following collections:
     - `students`
     - `admins`
     - `transactions`
     - `products`
     - `orders`
     - `settings`

5. **Set up Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=your-project-id
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Schema

### Students Collection
```typescript
{
  studentId: string;      // Unique student identifier
  firstName: string;      // Student's first name
  lastName: string;       // Student's last name
  email: string;          // Student's email
  course: string;         // Course/Program
  yearLevel: string;      // Year level
  balance: number;        // Account balance
  isActive: boolean;      // Account status
  createdAt: string;      // Creation timestamp
  updatedAt: string;      // Last update timestamp
}
```

### Admins Collection
```typescript
{
  username: string;       // Admin username
  email: string;          // Admin email
  role: 'admin' | 'cashier' | 'manager';  // Role type
  isActive: boolean;      // Account status
  createdAt: string;      // Creation timestamp
  updatedAt: string;      // Last update timestamp
}
```

### Transactions Collection
```typescript
{
  studentId: string;      // Student ID
  amount: number;         // Transaction amount
  status: 'Paid' | 'Partial' | 'Credit';  // Transaction status
  items?: string[];       // Items purchased
  cashierId: string;      // Cashier/admin ID
  createdAt: string;      // Transaction timestamp
}
```

### Products Collection
```typescript
{
  name: string;           // Product name
  description: string;    // Product description
  price: number;          // Product price
  category: string;       // Product category
  isAvailable: boolean;   // Availability status
  stock?: number;         // Stock quantity
  imageUrl?: string;      // Product image URL
  createdAt: string;      // Creation timestamp
  updatedAt: string;      // Last update timestamp
}
```

## 🎨 Design System

The application uses a custom design system built on top of shadcn/ui with:

- **Primary Color**: Green (#14a800) - University branding
- **Typography**: 14px base font size
- **Components**: Consistent shadcn/ui design patterns
- **Dark Mode**: Full dark mode support
- **Responsive**: Mobile-first design approach

## 📱 User Interfaces

### Admin Dashboard
- **Overview**: Key metrics and analytics
- **Student Management**: Add, edit, and manage students
- **Transaction History**: View and manage transactions
- **Product Management**: Manage canteen products
- **Settings**: System configuration
- **Barcode Scanner**: Quick transaction processing

### Student Portal
- **Dashboard**: Personal transaction history and analytics
- **Balance**: Current account balance
- **Recent Transactions**: Latest purchase history
- **Analytics**: Spending patterns and insights

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/          # React components
│   ├── admin/          # Admin-specific components
│   ├── student/        # Student-specific components
│   ├── ui/             # Reusable UI components
│   └── figma/          # Figma-specific components
├── contexts/           # React contexts
├── lib/                # Utility functions and services
│   ├── appwrite.ts     # Appwrite configuration
│   ├── services.ts     # Database services
│   └── utils.ts        # Utility functions
├── styles/             # Global styles
├── App.tsx             # Main application component
├── main.tsx            # Application entry point
└── index.css           # Global CSS
```

## 🚀 Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy to your preferred platform**
   - Vercel: `vercel --prod`
   - Netlify: `netlify deploy --prod`
   - GitHub Pages: Configure GitHub Actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- [ ] Real-time notifications
- [ ] Mobile app development
- [ ] Advanced analytics
- [ ] Integration with payment gateways
- [ ] Multi-language support
- [ ] Advanced reporting features 