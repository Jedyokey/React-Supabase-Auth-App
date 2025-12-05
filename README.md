# React + Supabase Dashboard Application

A modern React dashboard application with authentication, real-time data, and comprehensive user management features.

## ✨ Features

### 🔐 Authentication & Security
- Secure email/password authentication with Supabase
- Password recovery flow with email verification
- Protected routes with role-based access
- Dark/Light theme switching
- User profile management with avatar upload

### 📊 Dashboard & Analytics
- Interactive charts (orders & revenue) with Chart.js
- Real-time data updates using Supabase subscriptions
- Performance metrics and statistics
- Responsive design for all devices

### 📝 Content Management
- Create, read, update, and delete posts
- Real-time comments system with user avatars
- Profile enrichment for posts and comments
- Loading skeletons for better UX

### 🛒 Orders Management
- Live orders dashboard with real-time CRUD operations
- User permission system (users can only modify their own orders)
- Admin capabilities for full order management
- Pagination and filtering
- Creator information display with profile names

### 🎨 User Interface
- Modern gradient designs with Tailwind CSS
- Dark/light theme support
- Responsive layouts for mobile and desktop
- Smooth animations and transitions
- Loading states and error handling

Quick links to workspace files
- [.env.example](.env.example)
- [.gitignore](.gitignore)
- [eslint.config.js](eslint.config.js)
- [index.html](index.html)
- [package.json](package.json)
- [vite.config.js](vite.config.js)
- [public/](public/)
- [src/](src/)
  - [src/main.jsx](src/main.jsx)
  - [src/App.jsx](src/App.jsx)
  - [src/AuthContext.jsx](src/AuthContext.jsx) — exports [`AuthProvider`](src/AuthContext.jsx) and [`useAuth`](src/AuthContext.jsx)
  - [src/supabaseClient.js](src/supabaseClient.js) — exports [`supabase`](src/supabaseClient.js)
  - [src/index.css](src/index.css)
  - [src/components/AuthConfirmHandler.jsx](src/components/AuthConfirmHandler.jsx) — [`AuthConfirmHandler`](src/components/AuthConfirmHandler.jsx)
  - [src/components/ProtectedRoute.jsx](src/components/ProtectedRoute.jsx) — [`ProtectedRoute`](src/components/ProtectedRoute.jsx)
  - [src/pages/Dashboard.jsx](src/pages/Dashboard.jsx) — [`Dashboard`](src/pages/Dashboard.jsx)
  - [src/pages/RecoverPassword.jsx](src/pages/RecoverPassword.jsx)
  - [src/pages/UpdatePassword.jsx](src/pages/UpdatePassword.jsx)
  - [src/pages/SignInPage/SignIn.jsx](src/pages/SignInPage/SignIn.jsx)
  - [src/pages/SignInPage/SignUp.jsx](src/pages/SignInPage/SignUp.jsx)

Requirements
- Node.js (LTS recommended)
- A Supabase project and API keys

Environment
- Copy [.env.example](.env.example) to `.env.local` and set:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY

Setup
1. Install dependencies:
   ```sh
   npm install
   ```
2. Run the development server:
   ```sh
   npm run dev
   ```
3. Open your browser and navigate to the provided local URL (usually `http://localhost:5173`).

Scripts
- **Build for production**: `npm run build`

Auth notes / important symbols
- The Supabase client is created in `src/supabaseClient.js` and exported as `supabase`.
- App-wide auth state uses `AuthProvider` (wraps the app in `src/main.jsx`) and exposes `useAuth`.
- Protected pages should be wrapped with `ProtectedRoute` — used for the dashboard in `src/App.jsx`.
- URL confirmation handling: Supabase email links may hit `/auth/confirm`; `AuthConfirmHandler` parses query params and redirects accordingly to `/update-password` or `/signin`.

Deployment tips
- Ensure your production environment has the same VITE_* env vars set.
- Build with `npm run build` and deploy the `dist/` output.
- If deploying to platforms that require specific host/port, update `vite.config.js` as needed.

Troubleshooting
- If auth state seems stale, check browser storage and that VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are correct.
- To debug session flow, see auth session logic in `AuthProvider` and the Supabase client in `src/supabaseClient.js`.
- For password recovery issues, verify the redirect URL in `src/pages/RecoverPassword.jsx`.

Contributing
- Keep components simple and test auth flows locally before pushing.
