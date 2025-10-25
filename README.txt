# Convertme Backend - Complete Setup Guide

A production-ready Node.js + Express backend for a modern file converter and editor platform with Clerk authentication, role-based access control, and comprehensive file operations.

## 🚀 Features

### Authentication & Authorization
- ✅ Clerk integration for authentication and billing
- ✅ Role-based access control (Free, Premium, Admin)
- ✅ Session management and JWT verification
- ✅ Webhook handlers for subscription updates

### File Operations
- ✅ Multi-file upload with validation
- ✅ Batch processing support
- ✅ Cloud storage integration (AWS S3 / Cloudinary)
- ✅ Automatic file cleanup (30-minute expiry)
- ✅ File size limits based on user role

### Conversion Features
- ✅ PDF ↔ Word, Excel, PowerPoint
- ✅ Image format conversions (JPG, PNG, WebP, SVG)
- ✅ Batch conversion for Premium users
- ✅ Real-time conversion status tracking

### Editing Features
- ✅ Image editing (crop, rotate, resize, compress)
- ✅ PDF annotations and text addition
- ✅ Background removal (Premium)
- ✅ Watermark removal (Premium)
- ✅ OCR text extraction (Premium)

### Admin Dashboard
- ✅ User management and role assignment
- ✅ System statistics and analytics
- ✅ File management and monitoring
- ✅ Activity logs and audit trails

### Security
- ✅ Input validation and sanitization
- ✅ Rate limiting on all routes
- ✅ Helmet.js security headers
- ✅ Environment variable protection
- ✅ SQL injection prevention

## 📁 Project Structure

```
convertme-backend/
├── config/
│   ├── database.js          # PostgreSQL configuration
│   └── clerk.js              # Clerk authentication setup
├── controllers/
│   ├── uploadController.js
│   ├── convertController.js
│   ├── editController.js
│   ├── mergeController.js
│   ├── dashboardController.js
│   ├── billingController.js
│   └── adminController.js
├── middleware/
│   ├── auth.js               # Clerk auth middleware
│   ├── roleCheck.js          # Role-based access control
│   ├── rateLimiter.js        # Rate limiting
│   └── validation.js         # Input validation
├── routes/
│   ├── uploadRoutes.js
│   ├── convertRoutes.js
│   ├── editRoutes.js
│   ├── mergeRoutes.js
│   ├── dashboardRoutes.js
│   ├── billingRoutes.js
│   └── adminRoutes.js
├── services/
│   ├── conversionService.js  # File conversion logic
│   ├── editService.js        # Image/PDF editing
│   ├── mergeService.js       # File merging
│   └── adminService.js       # Admin operations
├── utils/
│   ├── logger.js             # Winston logging
│   ├── activityLogger.js     # User activity tracking
│   ├── cloudStorage.js       # S3/Cloudinary integration
│   ├── validators.js         # Input validators
│   ├── errorHandler.js       # Custom error classes
│   ├── helpers.js            # Helper functions
│   └── fileTypeDetector.js   # File type detection
├── uploads/                  # Temporary file storage
├── logs/                     # Application logs
├── .env                      # Environment variables
├── server.js                 # Application entry point
└── package.json              # Dependencies
```

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 16+ and npm 8+
- PostgreSQL database (or Supabase)
- Clerk account with API keys
- LibreOffice (for document conversions)
- Tesseract OCR (optional, for OCR features)

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd convertme-backend

# Install dependencies
npm install

# Install system dependencies (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install libreoffice tesseract-ocr ghostscript

# For macOS
brew install libreoffice tesseract ghostscript
```

### Step 2: Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Database (PostgreSQL/Supabase)
DATABASE_URL=postgresql://username:password@localhost:5432/convertme

# Clerk Authentication
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Cloud Storage (Optional - Choose one)
# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=convertme-files

# OR Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# File Limits
MAX_FREE_UPLOADS_PER_DAY=3
MAX_PREMIUM_UPLOADS_PER_DAY=1000
MAX_FREE_FILE_SIZE=5242880
MAX_PREMIUM_FILE_SIZE=104857600

# Allowed File Types
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,svg,gif,webp

# Logging
LOG_LEVEL=info
```

### Step 3: Database Setup

```bash
# Create database
createdb convertme

# The application will auto-create tables on first run
# Or manually run:
psql -d convertme -f scripts/schema.sql
```

### Step 4: Clerk Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Enable Email/Password and Social Login providers
4. Set up subscription products in Stripe integration
5. Add webhook endpoint: `https://your-domain.com/api/billing/webhook`
6. Copy API keys to `.env` file

### Step 5: Start the Server

```bash
# Development mode
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:5000`

## 📡 API Endpoints

### Authentication
All protected routes require Clerk authentication header:
```
Authorization: Bearer <clerk-session-token>
```

### Upload Routes
```
POST   /api/upload              # Upload files
GET    /api/upload/history      # Get upload history
GET    /api/upload/download/:id # Download file
DELETE /api/upload/:id          # Delete file
```

### Conversion Routes
```
POST   /api/convert             # Convert single file
POST   /api/convert/batch       # Batch convert (Premium)
GET    /api/convert/status/:id  # Get conversion status
GET    /api/convert/formats     # Get supported formats
```

### Edit Routes
```
POST   /api/edit/crop           # Crop image
POST   /api/edit/rotate         # Rotate image
POST   /api/edit/resize         # Resize image
POST   /api/edit/compress       # Compress file
POST   /api/edit/remove-bg      # Remove background (Premium)
POST   /api/edit/remove-watermark # Remove watermark (Premium)
POST   /api/edit/pdf/annotate   # Annotate PDF
POST   /api/edit/pdf/add-text   # Add text to PDF
POST   /api/edit/ocr            # OCR extraction (Premium)
```

### Merge Routes
```
POST   /api/merge/pdf           # Merge PDFs
POST   /api/merge/images-to-pdf # Convert images to PDF
POST   /api/merge/images        # Merge images into collage
```

### Dashboard Routes
```
GET    /api/dashboard           # Get user dashboard
GET    /api/dashboard/stats     # Get user statistics
GET    /api/dashboard/recent    # Get recent files
```

### Billing Routes
```
POST   /api/billing/webhook     # Clerk webhook handler
GET    /api/billing/subscription # Get subscription info
POST   /api/billing/create-checkout # Create checkout session
POST   /api/billing/cancel      # Cancel subscription
```

### Admin Routes (Admin Only)
```
GET    /api/admin/stats         # System statistics
GET    /api/admin/stats/daily   # Daily statistics
GET    /api/admin/users         # Get all users
GET    /api/admin/users/:id     # Get user details
PUT    /api/admin/users/:id/role # Update user role
DELETE /api/admin/users/:id     # Delete user
GET    /api/admin/files         # Get all files
GET    /api/admin/files/stats   # File statistics
DELETE /api/admin/files/:id     # Delete file
GET    /api/admin/logs          # Activity logs
```

## 🔐 Role-Based Access

### Free Users
- 3 uploads per day
- Max file size: 5MB
- Basic conversions and editing
- No batch operations

### Premium Users
- Unlimited uploads (1000/day limit)
- Max file size: 100MB
- All conversion and editing features
- Batch operations
- Background removal
- Watermark removal
- OCR text extraction

### Admin Users
- All Premium features
- User management
- System statistics
- File management
- Activity logs access

## 🚀 Deployment

### Deploy to Heroku

```bash
# Login to Heroku
heroku login

# Create app
heroku create convertme-api

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set CLERK_SECRET_KEY=sk_live_xxxxx
# ... set all other env vars

# Deploy
git push heroku main

# Open app
heroku open
```

### Deploy to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add PostgreSQL
railway add

# Deploy
railway up
```

### Deploy to DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure environment variables
3. Add PostgreSQL database
4. Deploy automatically on push

### Deploy with Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    libreoffice \
    tesseract-ocr \
    ghostscript

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["npm", "start"]
```

```bash
# Build and run
docker build -t convertme-api .
docker run -p 5000:5000 --env-file .env convertme-api
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test -- --coverage

# Run specific test file
npm test -- uploadController.test.js
```

## 📊 Monitoring & Logs

Logs are stored in the `logs/` directory:
- `error.log` - Error logs
- `combined.log` - All logs

View real-time logs:
```bash
# Development
tail -f logs/combined.log

# Production (Heroku)
heroku logs --tail

# Production (Railway)
railway logs
```

## 🔧 Troubleshooting

### LibreOffice not found
```bash
# Ubuntu/Debian
sudo apt-get install libreoffice

# macOS
brew install libreoffice
```

### PostgreSQL connection failed
- Check DATABASE_URL format
- Ensure PostgreSQL is running
- Verify credentials and database exists

### Clerk authentication fails
- Verify CLERK_SECRET_KEY is correct
- Check webhook secret matches Clerk dashboard
- Ensure frontend sends correct session token

### File upload fails
- Check file size limits
- Verify uploads directory is writable
- Check disk space

## 📝 Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| NODE_ENV | Yes | Environment (development/production) |
| PORT | Yes | Server port (default: 5000) |
| DATABASE_URL | Yes | PostgreSQL connection string |
| CLERK_PUBLISHABLE_KEY | Yes | Clerk publishable key |
| CLERK_SECRET_KEY | Yes | Clerk secret key |
| CLERK_WEBHOOK_SECRET | Yes | Clerk webhook secret |
| AWS_BUCKET_NAME | No | S3 bucket for cloud storage |
| CLOUDINARY_CLOUD_NAME | No | Cloudinary cloud name |
| MAX_FREE_UPLOADS_PER_DAY | No | Free user upload limit (default: 3) |
| MAX_PREMIUM_UPLOADS_PER_DAY | No | Premium upload limit (default: 1000) |
| ALLOWED_FILE_TYPES | No | Comma-separated file extensions |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- GitHub Issues: [your-repo/issues]
- Email: support@convertme.com
- Documentation: [docs.convertme.com]

---

**Built with ❤️ using Node.js, Express, Clerk, and PostgreSQL**