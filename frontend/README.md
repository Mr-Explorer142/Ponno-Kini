# Ponno Kini Frontend

React storefront and administration dashboard for Ponno Kini, connected to the Laravel REST API.

## Features

- **Storefront:** Responsive home page with featured products and categories; searchable catalog with category, price, sorting, and pagination controls.
- **Product details:** Product information, recommendations, reviews, and customer questions.
- **Cart and checkout:** Persistent cart, quantity and selection controls, stock checks, delivery calculation, and order checkout.
- **Customer account:** Registration, login, social login, email verification, password recovery, profile photo uploads, profile and security settings, order history, payment results, and invoice downloads.
- **Customer reviews:** Reviewers' profile photos appear alongside verified-purchase reviews in a navigable homepage carousel.
- **Admin workspace:** Sales dashboard and charts, product and category management, order and payment tracking, user management, notifications, and customer Q&A. Admin product tools include Gemini-assisted descriptions.
- **Preferences:** English/Bengali language selection and light/dark themes.

## Tech stack

- **React 19** for reusable, interactive storefront and admin screens.
- **React Router 7** for client-side routes and protected customer/admin pages.
- **Vite 8** for local development and production builds.
- **Tailwind CSS 4** and Base UI components for responsive styling and accessible UI primitives.
- **Axios** for Laravel API requests; **Zustand** for authentication and persistent cart state.
- **ApexCharts** for admin analytics; **Lucide React** for interface icons.

The API client currently targets `http://localhost:8000/api`. Start the Laravel backend before using the app.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`; check code style with `npm run lint`.

## Screenshots

Replace each placeholder with a screenshot of the corresponding page. Capture pages with representative data and avoid including real customer information.

### Storefront

- Home — **Screenshot:** Attach Home.jsx screenshot here.
- Product catalog — **Screenshot:** Attach ProductCatalog.jsx screenshot here.
- Product details — **Screenshot:** Attach ProductDetail.jsx screenshot here.
- Cart and checkout — **Screenshot:** Attach Cart.jsx screenshot here.

### Account and orders

- Login — **Screenshot:** Attach Login.jsx screenshot here.
- Registration — **Screenshot:** Attach Register.jsx screenshot here.
- Email verification — **Screenshot:** Attach VerifyEmail.jsx screenshot here.
- Forgot password — **Screenshot:** Attach ForgotPassword.jsx screenshot here.
- Reset password — **Screenshot:** Attach ResetPassword.jsx screenshot here.
- Profile and account settings — **Screenshot:** Attach Profile.jsx screenshot here.
- Order history and invoices — **Screenshot:** Attach Orders.jsx screenshot here.
- Payment result — **Screenshot:** Attach OrderResult.jsx screenshot here.

### Admin

- Analytics dashboard — **Screenshot:** Attach Dashboard.jsx screenshot here.
- Products — **Screenshot:** Attach AdminProducts.jsx screenshot here.
- Categories — **Screenshot:** Attach AdminCategories.jsx screenshot here.
- Orders — **Screenshot:** Attach AdminOrders.jsx screenshot here.
- Payments — **Screenshot:** Attach AdminPayments.jsx screenshot here.
- Notifications — **Screenshot:** Attach AdminNotifications.jsx screenshot here.
- Product questions — **Screenshot:** Attach AdminQuestions.jsx screenshot here.
- Users — **Screenshot:** Attach AdminUsers.jsx screenshot here.
- Settings — **Screenshot:** Attach AdminSettings.jsx screenshot here.
