# Ponno Kini

Ponno Kini is a full-stack e-commerce application with a Laravel REST API and a React storefront. It supports the complete shopping flow—from browsing and account verification through checkout, payment, order management, and post-purchase support—with separate tools for store administrators.

[Live Application](https://ponno-kini.vercel.app)

## Backend and API

### Features

- **Authentication and account security:** Laravel Sanctum token authentication, uploadable profile photos, email verification codes, password reset, Google/GitHub social login, role-based access (`admin` and `customer`), and rate-limited API routes.
- **Product catalog:** Searchable, filterable, paginated products and categories; admin catalog management; Cloudinary image storage; and cached product listings with cache invalidation.
- **Shopping and orders:** Server-calculated order totals, stock checks, Bangladesh delivery pricing, order history, status management, and downloadable PDF invoices.
- **Payments:** SSLCommerz checkout, payment result callbacks, and an IPN webhook.
- **Customer engagement:** Verified-purchase product reviews displayed in a homepage carousel with reviewer profile photos, product questions and admin answers, and in-app notifications.
- **AI features:** Google Gemini-assisted product descriptions for admins, plus product and cart recommendations.
- **Admin API:** Store summary and sales analytics, product/category/order/user management, payment tracking, and customer question management.

### Technology stack

| Layer | Technologies |
|---|---|
| Backend | PHP 8.4+, Laravel 13 |
| Authentication and authorization | Laravel Sanctum, Laravel Socialite (`laravel/socialite`) for Google/GitHub OAuth, Spatie Laravel Permission |
| Database and caching | SQLite by default, MySQL compatible, Laravel Cache (Redis supported) |
| Product image storage | Cloudinary |
| AI | Google Gemini |
| Payments and invoices | SSLCommerz, DomPDF |
| Backend testing | Pest, PHPUnit |
| Frontend | React 19, React Router 7, Vite 8 |
| Frontend styling and UI | Shadcn UI, Tailwind CSS 4, Base UI |
| Frontend state and API | Zustand, Axios |
| Frontend charts and icons | ApexCharts, Lucide React, React Icons |
| Frontend linting | ESLint |

### API overview

The API base path is `/api`. The endpoints below are relative to that path. Public auth endpoints use the strict auth rate limiter; public browsing and authenticated endpoints use the general API limiter. Customer order, payment, review, and question routes require a verified account. Admin routes additionally require the `admin` role.

| Area | Method and endpoint | Access |
|---|---|---|
| Authentication | `POST /register`, `POST /login`, `POST /forgot-password`, `POST /reset-password` | Public |
| Catalog | `GET /products`, `GET /product/{product}`, `GET /categories`, `GET /categories/{category}`, `GET /reviews` | Public |
| Social login | `GET /auth/{provider}/redirect`, `GET /auth/{provider}/callback` (`provider`: `google` or `github`) | Public |
| Recommendations | `POST /cart/recommendations`, `POST /products/{product}/recommendations` | Public |
| Payment callbacks | `POST /payment/success`, `POST /payment/fail`, `POST /payment/cancel`, `POST /payment/ipn` | Payment gateway |
| Email verification | `GET /email/verification-status`, `POST /email/verify-code`, `POST /email/verification-notification` | Authenticated |
| Session and notifications | `GET /me`, `POST /logout`, `GET /notifications`, `PATCH /notifications/{notification}/read`, `POST /notifications/read-all` | Authenticated |
| Profile | `PATCH /profile`, `POST /profile/email/request`, `POST /profile/email/verify`, `POST /profile/email/resend`, `POST /profile/password/request`, `POST /profile/password/verify`, `POST /profile/password/resend` | Authenticated |
| Profile photo | `POST /profile/avatar` (multipart image upload; JPG, PNG, or WebP, max 5 MB) | Authenticated |
| Customer orders and payments | `GET /orders`, `POST /orders`, `GET /orders/{order}`, `GET /orders/{order}/invoice`, `POST /orders/{order}/pay` | Verified |
| Customer engagement | `POST /products/{product}/reviews`, `POST /products/{product}/questions` | Verified |
| Admin dashboard | `GET /admin/dashboard` | Admin |
| Admin analytics | `GET /admin/stats/summary`, `GET /admin/stats/sales`, `GET /admin/stats/orders-by-status`, `GET /admin/stats/payment-methods`, `GET /admin/stats/payment-status`, `GET /admin/stats/top-products`, `GET /admin/stats/sales-by-category`, `GET /admin/stats/sales-by-city`, `GET /admin/stats/new-customers`, `GET /admin/stats/ratings`, `GET /admin/stats/orders-heatmap` | Admin |
| Admin catalog | `GET /admin/products`, `POST /products`, `POST /products/{product}`, `DELETE /products/{product}`, `GET /admin/categories`, `POST /categories`, `PUT /categories/{category}`, `DELETE /categories/{category}` | Admin |
| Admin orders and payments | `GET /admin/orders`, `GET /admin/orders/{order}`, `GET /admin/order-options`, `POST /admin/orders`, `PUT /admin/orders/{order}`, `PATCH /orders/{order}/status` | Admin |
| Admin customers and questions | `GET /admin/questions`, `PATCH /questions/{question}/answer`, `GET /admin/users`, `POST /admin/users`, `POST /admin/users/{user}/verify-email` | Admin |
| Admin AI tools | `POST /ai/generate-description`, `POST /ai/generate-image` | Admin |

`POST /ai/generate-image` is registered by the API but is not used by the storefront or admin product workflow; product image generation is not presented as an application feature. Run `php artisan route:list --path=api` for route names and middleware details.

## Run locally

### Requirements

PHP 8.4+, Composer, Node.js, and npm. The example environment is configured for SQLite; set database values in `.env` to use MySQL instead. External integrations (email, Cloudinary, Gemini, and SSLCommerz) need credentials to use those services.

### Backend

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve
```

Set `FRONTEND_URL` and any integration credentials in `.env`. For queued jobs, run `php artisan queue:work` in a separate terminal.

### Frontend

The React storefront and admin dashboard connect to the Laravel REST API. The API client uses `http://localhost:8000/api` by default.

```bash
cd frontend
npm install
npm run dev
```

#### Frontend features

- **Storefront:** Responsive home page with featured products and categories; searchable catalog with category, price, sorting, and pagination controls.
- **Product details:** Product information, recommendations, reviews, and customer questions.
- **Cart and checkout:** Persistent cart, quantity and selection controls, stock checks, delivery calculation, and order checkout.
- **Customer account:** Registration, login, Google/GitHub social login, email verification, password recovery, profile photo upload, profile and security settings, order history, payment results, and invoice downloads.
- **Customer reviews:** Review cards include the reviewer's profile photo and appear in a navigable homepage carousel.
- **Admin workspace:** Sales dashboard and charts, product and category management, order and payment tracking, user management, notifications, and customer Q&A. Admin product tools include Gemini-assisted descriptions.
- **Preferences:** English/Bengali language selection and light/dark themes.

Build the frontend with `npm run build` or run its lint checks with `npm run lint` from the `frontend` directory.

#### Frontend screenshots

Replace each placeholder with a screenshot of that page. Use representative data and avoid including real customer information.

**Storefront**

<img width="1905" height="912" alt="Screenshot 2026-11-02 102913" src="https://github.com/user-attachments/assets/c8887f6c-c286-47f3-9b8e-5b500532ebf9" />
<img width="1465" height="921" alt="Screenshot 2026-11-02 100637" src="https://github.com/user-attachments/assets/d0cf45f0-9c0d-47ef-bfca-f7e8f4cfa8e2" />
<img width="1900" height="901" alt="Screenshot 2026-11-02 100845" src="https://github.com/user-attachments/assets/f5972cb7-5f65-4458-8eb4-6eb5fe9a41eb" />
<img width="1193" height="917" alt="Screenshot 2026-11-02 101043" src="https://github.com/user-attachments/assets/eb9086a6-c1d7-4034-bd09-d75860a48fe3" />


**Account and orders**

<img width="1907" height="858" alt="Screenshot 2026-11-02 103332" src="https://github.com/user-attachments/assets/d9e9fa67-f181-4865-a149-f4019f1c67b5" />
<img width="1909" height="898" alt="Screenshot 2026-11-02 103357" src="https://github.com/user-attachments/assets/554ec6e7-e3a2-4133-8172-a00bf54157c5" />
<img width="1908" height="903" alt="Screenshot 2026-11-02 103052" src="https://github.com/user-attachments/assets/890a7966-9694-4297-9290-a8de3697a453" />
<img width="1904" height="882" alt="image" src="https://github.com/user-attachments/assets/95e0af35-efeb-472b-9353-05b4c99e376b" />

**Admin Panel (Dark Mode View)**

<img width="1899" height="913" alt="Screenshot 2026-11-02 103555" src="https://github.com/user-attachments/assets/4d1b57f5-2fd9-450f-b6c4-e4f948696198" />
<img width="1885" height="913" alt="Screenshot 2026-11-02 103637" src="https://github.com/user-attachments/assets/12d1fdb6-4fab-4327-8c90-d06d639d9f6c" />
<img width="1903" height="911" alt="Screenshot 2026-11-02 103706" src="https://github.com/user-attachments/assets/6d444139-21d1-43e3-9775-903944634818" />
<img width="1907" height="908" alt="Screenshot 2026-11-02 103743" src="https://github.com/user-attachments/assets/dc3449ba-0320-4b80-a88c-876f2131a8f8" />
<img width="1894" height="911" alt="Screenshot 2026-11-02 103757" src="https://github.com/user-attachments/assets/b88f41de-a958-479a-a2e3-9b81eb2657d9" />
<img width="1913" height="914" alt="Screenshot 2026-11-02 103937" src="https://github.com/user-attachments/assets/ce7d8d55-fd0f-4da8-8203-c327f01248ec" />
<img width="1910" height="911" alt="Screenshot 2026-11-02 104000" src="https://github.com/user-attachments/assets/82d65b02-5cbf-4dd1-b58e-f5923a4f8eeb" />
<img width="1906" height="910" alt="Screenshot 2026-11-02 104031" src="https://github.com/user-attachments/assets/794e61f7-3775-43c5-88f6-f3695ff9ddac" />
<img width="1916" height="914" alt="Screenshot 2026-11-02 104042" src="https://github.com/user-attachments/assets/8d3442a9-5683-4d60-a297-d686ba4ccee2" />


Run the backend test suite with `php artisan test`. Start `php artisan schedule:work` locally to run scheduled maintenance tasks.
