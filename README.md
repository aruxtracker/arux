# ARUX – Personal Finance & Life Management App

A smart, minimal dashboard built for high-performance individuals to manage finances, schedule, and personal growth in one place.

## Features

- **Personal Finance Management**: Track income, expenses, accounts, budgets, and subscriptions.
- **Smart Analytics**: Category-level breakdown, monthly trends, and spending summaries.
- **Task & Life Management**: Interactive task lists, dream buckets, and idea tracking.
- **PWA & Offline Ready**: Installable web application with background push notifications.

## Technologies Used

- **Vite**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
- **Supabase**

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (v18 or newer recommended).

### Installation

1. Clone the repository:
   ```sh
   git clone <YOUR_GIT_URL>
   cd arux
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_PROJECT_ID="your-project-id"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   ```

4. Start development server:
   ```sh
   npm run dev
   ```

5. Build for production:
   ```sh
   npm run build
   ```
