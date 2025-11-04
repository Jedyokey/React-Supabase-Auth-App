# test-supabase

Minimal React + Vite starter that demonstrates Supabase auth (email sign-up, sign-in, password recovery) and a protected dashboard.

### Quick links to workspace files
- [index.html](index.html)
- [package.json](package.json)
- [vite.config.js](vite.config.js)
- [eslint.config.js](eslint.config.js)
- [.gitignore](.gitignore)
- [.env.example](.env.example)
- [.env.local](.env.local)

### Source
- [src/main.jsx](src/main.jsx)
- [src/App.jsx](src/App.jsx)
- [src/index.css](src/index.css)
- [src/supabaseClient.js](src/supabaseClient.js) — exports [`supabase`](src/supabaseClient.js)
- [src/AuthContext.jsx](src/AuthContext.jsx) — exports [`AuthProvider`](src/AuthContext.jsx) and [`useAuth`](src/AuthContext.jsx)
- [src/components/ProtectedRoute.jsx](src/components/ProtectedRoute.jsx) — [`ProtectedRoute`](src/components/ProtectedRoute.jsx)
- [src/components/AuthConfirmHandler.jsx](src/components/AuthConfirmHandler.jsx) — [`AuthConfirmHandler`](src/components/AuthConfirmHandler.jsx)
- [src/pages/Dashboard.jsx](src/pages/Dashboard.jsx)
- [src/pages/RecoverPassword.jsx](src/pages/RecoverPassword.jsx)
- [src/pages/UpdatePassword.jsx](src/pages/UpdatePassword.jsx)
- [src/pages/SignInPage/SignIn.jsx](src/pages/SignInPage/SignIn.jsx)
- [src/pages/SignInPage/SignUp.jsx](src/pages/SignInPage/SignUp.jsx)
- [src/assets/](src/assets/)
- [public/](public/)

### Overview
- Uses Supabase client in [src/supabaseClient.js](src/supabaseClient.js) to manage auth state.
- Global auth state is provided by [`AuthProvider`](src/AuthContext.jsx) and consumed via [`useAuth`](src/AuthContext.jsx).
- Routes and protected access are handled in [src/App.jsx](src/App.jsx) and [`ProtectedRoute`](src/components/ProtectedRoute.jsx).
- Password recovery flow:
  - Request reset in [src/pages/RecoverPassword.jsx](src/pages/RecoverPassword.jsx)
  - Supabase will redirect to [src/components/AuthConfirmHandler.jsx](src/components/AuthConfirmHandler.jsx) (route `/auth/confirm`) which forwards to [src/pages/UpdatePassword.jsx](src/pages/UpdatePassword.jsx)

### Environment
- Copy `.env.example` to `.env.local` and fill in:
  - VITE_SUPABASE_URL
  - VITE_SUPABASE_ANON_KEY
- Example:
```sh
# shell
cp [.env.example](http://_vscodecontentref_/0) [.env.local](http://_vscodecontentref_/1)
# then edit [.env.local](http://_vscodecontentref_/2) to add values
```

## Scripts

- Install dependencies:
npm install

- Run dev server (hot reload):
npm run dev

- Build for production:
npm run build

## Auth notes / important symbols

The Supabase client is created in src/supabaseClient.js and exported as supabase.
App-wide auth state uses AuthProvider (wraps the app in src/main.jsx) and exposes useAuth.
Protected pages should be wrapped with ProtectedRoute — used for the dashboard in src/App.jsx.
URL confirmation handling: Supabase email links may hit /auth/confirm; AuthConfirmHandler parses query params and redirects accordingly to /update-password or /signin.
Deployment tips

Ensure your production environment has the same VITE_* env vars set.
Build with npm run build and deploy the dist/ output.
If deploying to platforms that require specific host/port, update vite.config.js as needed.
Troubleshooting

If auth state seems stale, check browser storage and that VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are correct.
To debug session flow, see auth session logic in AuthProvider and the Supabase client in src/supabaseClient.js.
For password recovery issues, verify the redirect URL in src/pages/RecoverPassword.jsx.
Contributing

Keep components simple and test auth flows locally before pushing.
