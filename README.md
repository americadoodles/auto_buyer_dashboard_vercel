
# Auto Buyer Demo - Scoring Stub

A full-stack application demonstrating vehicle listing scoring and user management with role-based access control.

## 🚀 Features

- **Vehicle Listings Management**: Ingest, normalize, score, and review vehicle listings
- **User Authentication**: Secure login/signup with role-based access control
- **Admin Panel**: User management, role management, and signup request approval
- **Real-time Scoring**: AI-powered vehicle scoring system
- **Responsive UI**: Modern React/Next.js frontend with Tailwind CSS

## 🏗️ Architecture

- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS, Framer Motion
- **Backend**: FastAPI with Python, PostgreSQL database
- **Authentication**: bcrypt password hashing with role-based access control
- **Deployment**: Vercel-ready configuration

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- PostgreSQL database (or Neon for Vercel deployment)

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd auto-buyer-vercel

# Install frontend dependencies
npm install

# Install backend dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/auto_buyer
# or for Vercel/Neon
NEON_DATABASE_URL=postgresql://username:password@host/database

# Backend URL (optional, defaults to /api)
NEXT_PUBLIC_BACKEND_URL=http://localhost:8001/api
```

### 3. Database Setup

```bash
# Run the main schema
psql -d your_database -f db/schema.sql

# Run migrations if needed
psql -d your_database -f db/migrate_users.sql
```

### 4. Start Development Servers

```bash
# Start both frontend and backend
npm run dev

# Or start separately:
npm run next-dev      # Frontend on http://localhost:3000
npm run fastapi-dev   # Backend on http://localhost:8001
```

## 🔧 Recent Fixes & Improvements

### Type Safety & Schema Consistency
- ✅ Fixed user schema mismatches between frontend and backend
- ✅ Added proper role name handling in user objects
- ✅ Updated components to use role names instead of hardcoded IDs
- ✅ Fixed database schema with proper foreign key constraints

### Authentication & Authorization
- ✅ Fixed bcrypt password hashing implementation
- ✅ Improved role-based access control
- ✅ Fixed user confirmation flow
- ✅ Added proper error handling for auth failures

### Database & API
- ✅ Fixed circular import issues in repositories
- ✅ Added proper database indexes for performance
- ✅ Improved error handling with custom ApiError class
- ✅ Fixed user role assignment in signup process

### Frontend Components
- ✅ Updated all components to use consistent role handling
- ✅ Fixed hardcoded role checks
- ✅ Improved error message display
- ✅ Added proper loading states

## 🚨 Known Issues & Limitations

### Security Considerations
- **Current**: Basic localStorage-based auth (demo purposes)
- **Production**: Should implement JWT tokens and secure session management
- **Recommendation**: Add CSRF protection and rate limiting

### Performance Optimizations
- **Current**: Basic pagination and sorting
- **Future**: Add virtual scrolling for large datasets, implement caching
- **Database**: Consider connection pooling for production

### Type Safety
- **Current**: Basic TypeScript implementation
- **Future**: Add strict mode, runtime validation, better error types

## 📁 Project Structure

```
├── api/                    # FastAPI backend
│   ├── core/              # Configuration, database, lifespan
│   ├── routes/            # API endpoints
│   ├── repositories/      # Data access layer
│   ├── schemas/           # Pydantic models
│   └── services/          # Business logic
├── app/                   # Next.js app directory
│   ├── auth/              # Authentication pages and hooks
│   └── admin/             # Admin panel pages
├── components/            # React components (atomic design)
│   ├── atoms/            # Basic UI components
│   ├── molecules/        # Compound components
│   ├── organisms/        # Complex components
│   └── templates/        # Page layouts
├── lib/                   # Shared utilities and types
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API client
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Helper functions
└── db/                    # Database schema and migrations
```

## 🔐 Role System

- **Admin**: Full access to all features, user management, role management
- **Buyer**: Access to vehicle listings, scoring, and notifications
- **Analyst**: Read-only access to listings and scoring data

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy - Vercel will automatically detect Next.js and FastAPI

### Environment Variables for Production
```env
DATABASE_URL=your_production_database_url
NODE_ENV=production
```

## 🧪 Testing

```bash
# Frontend tests
npm run test

# Backend tests
pytest api/

# E2E tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the known issues section above
2. Review the database migration scripts
3. Ensure all dependencies are properly installed
4. Check environment variable configuration

## 🔄 Migration Notes

If upgrading from a previous version:
1. Run `db/migrate_users.sql` to update existing user tables
2. Ensure all environment variables are set
3. Restart both frontend and backend services

If using the already existing schema
ALTER TABLE listings ADD COLUMN images TEXT[];