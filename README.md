# NutriGenie 🥗

An AI-powered meal planning application that generates personalized, budget-conscious meal plans with accurate grocery pricing and store integration.

## 🎯 Overview  
NutriGenie combines the power of AI with real-world grocery data to create practical meal plans that fit your budget and nutritional needs. Using GPT-4 with RAG (Retrieval Augmented Generation), it generates intelligent meal suggestions based on ingredients actually available at your local stores.

## ✨ Key Features

- 🤖 **AI-Powered Meal Planning**: Uses GPT-4 with semantic ingredient matching
- 💰 **Budget-Conscious**: Stays within your specified budget using real grocery pricing  
- 🏪 **Multi-Store Support**: Kroger, Safeway, Walmart, Whole Foods, and more
- 🔍 **Smart Ingredient Matching**: Vector similarity search for ingredient alternatives
- 📱 **Modern UI**: Clean, responsive React/Next.js interface
- 📊 **Nutritional Tracking**: Detailed macro and calorie breakdowns
- 🛒 **Smart Shopping Lists**: Auto-generated lists with store-specific pricing
- 📄 **PDF Export**: Export meal plans and grocery lists

## 🍽️ Detailed Functionality

### 🎯 User Onboarding & Profile Management
- **Comprehensive Onboarding**: Collects age, weight, height, activity level, and fitness goals
- **Automatic Macro Calculation**: Uses Mifflin-St Jeor equation to calculate TDEE and optimal macronutrient distribution
- **Dietary Preferences**: Supports vegetarian, vegan, gluten-free, keto, paleo, and custom restrictions
- **Location-Based Setup**: ZIP code integration for nearby store discovery
- **Profile Persistence**: Secure user data storage with Supabase authentication

### 🤖 AI-Powered Meal Generation
- **GPT-4 Integration**: Advanced language model creates realistic, varied meal plans
- **RAG Enhancement**: Retrieval Augmented Generation ensures ingredient availability and pricing accuracy
- **Function Calling**: Structured JSON schema ensures consistent meal plan format
- **Budget Optimization**: AI considers ingredient costs to stay within weekly budget constraints
- **Nutritional Balance**: Ensures daily calorie and macro targets are met across all meals
- **Recipe Variety**: Generates diverse recipes to prevent meal plan monotony

### 🏪 Store Integration & Pricing
- **Multi-Store Support**: Integrates with major grocery chains:
  - **Kroger**: Full API integration with real-time pricing
  - **Safeway**: Web scraping with intelligent fallback pricing
  - **Walmart**: Product availability and price matching
  - **Whole Foods, Target, ALDI**: Research-based price multipliers
- **Geographic Discovery**: Finds nearby stores using ZIP code lookup
- **Price Validation**: Filters out unrealistic prices (e.g., uniform $5.00 errors)
- **Store-Specific Adjustments**: Applies realistic price multipliers for unsupported stores
- **Automated Price Refresh**: Daily GitHub Actions workflows update pricing data

### 🔍 Smart Ingredient System
- **Vector Embeddings**: OpenAI text-embedding-3-small for semantic ingredient matching
- **Similarity Search**: pgvector database for finding ingredient alternatives
- **Unit Conversion Intelligence**: 
  - Weight ↔ Volume conversions (g↔ml, lb↔oz)
  - Liquid density calculations for accurate milk/juice pricing
  - Package size assumptions (realistic portions vs. bulk quantities)
- **Ingredient Availability**: Cross-references meal plan ingredients with store inventory
- **Substitution Suggestions**: Recommends alternatives when ingredients are unavailable

### 📊 Nutritional Analysis
- **Detailed Macro Tracking**: Protein, carbohydrates, fat, and calorie counts per meal and day
- **Nutritional Goals**: Customizable targets based on fitness objectives (weight loss, muscle gain, maintenance)
- **Serving Size Accuracy**: Precise portion calculations for accurate nutritional data
- **Dietary Compliance**: Ensures generated meals adhere to specified dietary restrictions
- **Visual Nutrition Display**: Clean charts and progress indicators for macro tracking

### 🛒 Intelligent Shopping Lists
- **Auto-Generated Lists**: Consolidates ingredients across all meals into organized shopping lists
- **Store-Specific Pricing**: Shows current prices from selected grocery stores
- **Quantity Optimization**: Calculates exact amounts needed to minimize waste
- **Category Organization**: Groups ingredients by store sections (produce, dairy, meat, etc.)
- **Cost Breakdown**: Displays individual item costs and total estimated spending
- **Multi-Store Support**: Generates separate lists if shopping at multiple stores

### 📱 User Experience Features
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Loading States**: Skeleton loaders and progress indicators during meal generation
- **Error Handling**: Graceful error recovery with helpful user feedback
- **Real-Time Updates**: Live status updates during meal plan generation
- **Accessible UI**: WCAG compliant design with keyboard navigation support
- **Dark/Light Mode**: Theme options for user preference

### 📄 Export & Sharing
- **PDF Generation**: Professional meal plan and grocery list exports
- **Print Optimization**: Clean, printer-friendly layouts
- **Email Integration**: Share meal plans via email
- **Recipe Details**: Complete cooking instructions, prep times, and serving information
- **Nutritional Summaries**: Exportable nutrition data for tracking apps

### 🔒 Security & Privacy
- **Supabase Authentication**: Secure user registration and login
- **Row-Level Security**: Database-level access controls
- **API Key Management**: Secure storage of third-party API credentials
- **Data Encryption**: All sensitive data encrypted at rest and in transit
- **Privacy Compliance**: GDPR-compliant data handling practices

### ⚡ Performance Optimizations
- **Caching Strategy**: Intelligent caching of pricing data and store information
- **Batch Processing**: Efficient ingredient embedding and price lookups
- **Database Optimization**: Indexed queries for fast meal plan retrieval
- **CDN Integration**: Fast asset delivery for global users
- **Background Jobs**: Non-blocking price updates and data processing

### 🔧 Developer Experience
- **Comprehensive API**: RESTful endpoints for all application functionality
- **Type Safety**: Full TypeScript implementation across frontend and backend
- **Error Logging**: Detailed logging for debugging and monitoring
- **Testing Suite**: Unit and integration tests for critical functionality
- **Development Tools**: Hot reloading, debugging, and development server setup

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework  
- **Supabase** - PostgreSQL with pgvector for embeddings
- **OpenAI GPT-4** - Meal plan generation and RAG
- **Python 3.9+** - Core backend language

### Frontend  
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/UI** - Modern component library

### Key Services
- **Price Scraping**: Real-time pricing from Kroger, Walmart, Safeway
- **RAG System**: Semantic ingredient matching with OpenAI embeddings  
- **Unit Conversion**: Smart quantity conversions (g↔ml, lb↔oz, etc.)
- **Store Integration**: Multi-store price comparison and availability

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account
- OpenAI API key

### Backend Setup

1. **Clone and setup:**
```bash
git clone <repository-url>
cd NutriGenie/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Environment variables:**
Create `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
KROGER_CLIENT_ID=your_kroger_client_id
KROGER_CLIENT_SECRET=your_kroger_client_secret
```

3. **Start backend:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. **Setup and start:**
```bash
cd ../frontend
npm install
```

2. **Environment variables:**
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key  
NEXT_PUBLIC_API_URL=http://localhost:8000
```

3. **Start frontend:**
```bash
npm run dev
```

## 🏗️ Architecture

### Database Schema
- **Users**: Authentication and preferences
- **Meal Plans**: Generated plans with dates and costs
- **Recipes**: Individual recipes with nutrition data
- **Ingredients**: Master list with vector embeddings
- **Stores**: Grocery store locations and details
- **Pricing**: Real-time prices by store and ingredient

### Core Components

**RAG Meal Planning** (`app/services/rag_meal_plan.py`):
- Semantic ingredient matching using vector similarity
- Context-aware GPT prompts with available ingredients
- Budget-conscious recipe generation with real pricing

**Pricing System** (`app/services/pricing.py`):
- Multi-store price aggregation and validation
- Store-specific multipliers for unsupported locations
- Price outlier detection and fallback logic

**Unit Conversion** (`app/services/unit_conversion.py`):
- Smart quantity conversions between units
- Liquid density calculations for accurate pricing
- Package size assumptions for realistic quantities

## 📝 Usage

1. **Account Setup**: Create account and complete onboarding
2. **Set Preferences**: Budget, nutrition goals, dietary restrictions, stores  
3. **Generate Plan**: AI creates personalized 7-day meal plan
4. **Review & Export**: View recipes, ingredients, costs, and export to PDF
5. **Shop Smart**: Use generated grocery list with store-specific pricing

## 🔧 Development

### Price Refresh System
Automated daily price updates via GitHub Actions:

```bash
PYTHONPATH=backend python backend/scripts/refresh_prices.py
```

Required secrets:
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`
- `KROGER_CLIENT_ID` / `KROGER_CLIENT_SECRET`

### Database Migrations  
Add SQL migrations to `backend/migrations/` and apply via Supabase dashboard.

### Testing
```bash
cd backend && pytest
```

### API Endpoints

#### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/signin` - User login
- `GET /auth/verify` - Email verification

#### User Management
- `GET /profiles` - Get user profile
- `PUT /profiles` - Update user profile
- `POST /profiles/macros` - Calculate and update macros

#### Meal Planning
- `POST /meal-plans/generate` - Generate new meal plan
- `GET /meal-plans` - List user's meal plans
- `GET /meal-plans/{id}` - Get specific meal plan
- `DELETE /meal-plans/{id}` - Delete meal plan

#### Store & Pricing
- `GET /stores/nearby` - Find nearby grocery stores
- `GET /stores/{id}/prices` - Get store-specific pricing
- `POST /stores/refresh-prices` - Trigger price refresh

#### Ingredients & RAG
- `GET /ingredients/search` - Search ingredients with embeddings
- `POST /ingredients/embed` - Generate ingredient embeddings
- `GET /ingredients/suggestions` - Get ingredient alternatives

