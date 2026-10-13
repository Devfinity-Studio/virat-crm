# Getting Started

## Prerequisites
- Node.js (v18+)
- PostgreSQL database
- pnpm or npm

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd virat-crm
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Copy `.env.example` to `.env` and fill in the required values:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/virat_crm"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   # ... other variables
   ```

4. **Run Database Migrations:**
   ```bash
   npx drizzle-kit push
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.
