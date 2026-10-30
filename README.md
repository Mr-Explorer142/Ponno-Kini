# E-Commerce REST API with AI

An AI featured e-commerce REST API built with Laravel. It combines token authentication and role-based access, a
cached product catalogue with Cloudinary image storage, an order and payment flow, verified-purchase reviews, PDF
invoices, and AI tools powered by Google Gemini. The core business rules are covered by automated Pest tests.

<!-- TODO: add the published Postman docs link and the live API URL here -->

## Key Features

- **Authentication & security**
    - Registration, login and logout with Laravel Sanctum bearer tokens
    - Email verification for customers (the seeded admin is pre-verified)
    - Role-based access control (`admin` / `customer`) with Spatie Laravel Permission
    - Rate limiting on auth and general API routes
- **Product & category management**
    - Admin-only CRUD with search, category/price filters, sorting and pagination
    - Image uploads to Cloudinary; images are replaced or deleted together with the product
    - Cached product listings with version-based cache invalidation (works with the file, database or Redis cache
      drivers)
- **Orders & payments**
    - Order totals are calculated from database prices, so client-submitted prices are ignored
    - Checkout integrated with SSLCommerz, plus background notifications
- **Reviews & Q&A**
    - Verified-purchase-only product reviews
    - Customer/admin Q&A threads
- **AI-powered tools (Google Gemini)**
    - **Description generator:** admins can draft SEO-friendly product descriptions in a chosen tone
    - **Smart cart recommendations:** Gemini picks cross-sell items from real catalogue products in structured JSON
      mode, with a same-category fallback so the endpoint never returns an empty result because of an AI failure
- **PDF invoices**
    - Downloadable HTML/CSS-based invoices generated with DomPDF (amounts shown in BDT)
- **Scheduled maintenance**
    - A scheduled task cancels orders that stay unpaid for 7 days
- **Automated testing**
    - Pest feature tests running on an in-memory SQLite database

## Tech Stack

| Area         | Technology                                 |
|--------------|--------------------------------------------|
| Framework    | Laravel 12 (PHP 8.2+)                      |
| Auth & roles | Laravel Sanctum, Spatie Laravel Permission |
| Database     | MySQL (SQLite in-memory for tests)         |
| Cache        | Laravel cache (file / database / Redis)    |
| Images       | Cloudinary (official PHP SDK)              |
| AI           | Google Gemini API                          |
| PDF          | DomPDF (`barryvdh/laravel-dompdf`)         |
| Email        | Mailtrap sandbox in development            |
| Payments     | SSLCommerz                                 |
| Testing      | Pest                                       |

## Installation & Setup

### Requirements

- PHP 8.2+ and Composer
- MySQL
- A [Cloudinary](https://cloudinary.com) account
- A [Google AI Studio](https://aistudio.google.com) API key
- A [Mailtrap](https://mailtrap.io) account (for local email testing)

### 1. Clone the repository and install dependencies

```bash
git clone https://github.com/yourusername/ecommerce-api.git
cd ecommerce-api
composer install
```

### 2. Configure the environment

```bash
cp .env.example .env      # on Windows: copy .env.example .env
php artisan key:generate
```

Create an empty MySQL database, then update `.env`:

```env
APP_URL=http://127.0.0.1:8000

DB_CONNECTION=mysql
DB_DATABASE=ecommerce
DB_USERNAME=root
DB_PASSWORD=

# Any Laravel cache driver works (file, database, redis)
CACHE_STORE=database

# Cloudinary (dashboard > API keys)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Google Gemini
GEMINI_API_KEY=your_google_ai_key
GEMINI_MODEL=gemini-3.8-flash

# Mailtrap sandbox (development only)
MAIL_MAILER=smtp
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=your_mailtrap_username
MAIL_PASSWORD=your_mailtrap_password

# SSLCommerz sandbox credentials
# (add your SSLCommerz variables here)
```

Never commit your `.env` file or any API secret.

### 3. Run migrations and seeders

```bash
php artisan migrate --seed
```

The seeder creates the `admin` and `customer` roles and an admin user (`admin@example.com`) with a verified email.
Change the default admin password before deploying anywhere public.

### 4. Start the application

```bash
php artisan serve

# Only needed if QUEUE_CONNECTION is not "sync":
php artisan queue:work
```

The API is now available at `http://127.0.0.1:8000/api`.

## API Overview

Base URL: `http://127.0.0.1:8000/api`

All requests should send `Accept: application/json`. Protected routes need `Authorization: Bearer <token>`, which is
returned by the register and login endpoints.

**Access levels:**

- **Public:** Needs no token.
- **Auth:** Needs a valid token.
- **Verified:** Needs a token and a verified email.
- **Admin:** Needs a verified email and the `admin` role.

### Authentication

| Method | Endpoint                            | Access | Description                                            |
|--------|-------------------------------------|--------|--------------------------------------------------------|
| POST   | `/register`                         | Public | Register and email a 6-character verification code    |
| POST   | `/login`                            | Public | Log in and receive a token                             |
| GET    | `/email/verification-status`        | Auth   | Get verification state and resend cooldown            |
| POST   | `/email/verify-code`                | Auth   | Verify with a code (10-minute expiry, 5-attempt lock) |
| POST   | `/email/verification-notification`  | Auth   | Resend the code (60-second cooldown)                  |
| POST   | `/forgot-password`                  | Public | Request a password reset                               |
| POST   | `/reset-password`                   | Public | Reset the password                                     |
| GET    | `/me`                               | Auth   | Current user                                           |
| POST   | `/logout`                           | Auth   | Revoke the current token                               |

After registration, the frontend opens `/verify-email`. The verification code
is stored as a hash; a successful verification marks the account verified and
clears the stored code.

### Catalog & recommendations

| Method | Endpoint                | Access | Description                                                                                                                   |
|--------|-------------------------|--------|-------------------------------------------------------------------------------------------------------------------------------|
| GET    | `/products`             | Public | List products. Query: `search`, `category_id`, `min_price`, `max_price`, `sort` (`price_asc`, `price_desc`, `oldest`), `page` |
| GET    | `/product/{id}`         | Public | Show a product                                                                                                                |
| GET    | `/categories`           | Public | List categories                                                                                                               |
| GET    | `/categories/{id}`      | Public | Show a category                                                                                                               |
| POST   | `/cart/recommendations` | Public | AI cross-sell suggestions. Body: `product_ids` (array of cart product IDs)                                                    |

### Orders & payments

| Method | Endpoint               | Access   | Description                                         |
|--------|------------------------|----------|-----------------------------------------------------|
| GET    | `/orders`              | Verified | List your orders                                    |
| POST   | `/orders`              | Verified | Create an order (the total is computed server-side) |
| GET    | `/orders/{id}`         | Verified | Show an order                                       |
| GET    | `/orders/{id}/invoice` | Verified | Download the PDF invoice                            |
| POST   | `/orders/{id}/pay`     | Verified | Start an SSLCommerz payment                         |

### Reviews & Q&A

| Method | Endpoint                   | Access   | Description                    |
|--------|----------------------------|----------|--------------------------------|
| POST   | `/products/{id}/reviews`   | Verified | Review a product you purchased |
| POST   | `/products/{id}/questions` | Verified | Ask a question about a product |
| PATCH  | `/questions/{id}/answer`   | Admin    | Answer a customer question     |

### Admin

| Method | Endpoint                   | Access | Description                                                                                                                                |
|--------|----------------------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------|
| POST   | `/products`                | Admin  | Create a product (multipart, optional `image`)                                                                                             |
| POST   | `/products/{id}`           | Admin  | Update a product (multipart, optional `image`)                                                                                             |
| DELETE | `/products/{id}`           | Admin  | Delete a product                                                                                                                           |
| POST   | `/categories`              | Admin  | Create a category                                                                                                                          |
| PUT    | `/categories/{id}`         | Admin  | Update a category                                                                                                                          |
| DELETE | `/categories/{id}`         | Admin  | Delete a category                                                                                                                          |
| PATCH  | `/orders/{id}/status`      | Admin  | Update an order's status                                                                                                                   |
| POST   | `/ai/generate-description` | Admin  | Generate a product description. Body: `product_name`, optional `features`, optional `tone` (`professional`, `playful`, `luxury`, `urgent`) |

### Payment gateway callbacks

SSLCommerz calls these endpoints itself; clients should not use them.

| Method | Endpoint           | Description                            |
|--------|--------------------|----------------------------------------|
| POST   | `/payment/success` | Payment succeeded                      |
| POST   | `/payment/fail`    | Payment failed                         |
| POST   | `/payment/cancel`  | Payment cancelled                      |
| POST   | `/payment/ipn`     | Instant payment notification (webhook) |

### Notes

- **Prices** are stored as whole BDT amounts (integers).
- **Product updates use `POST`, not `PUT`.** PHP does not parse multipart form data on `PUT`, so sending an image with
  an update only works over `POST`.
- **Rate limits:** authentication endpoints use a stricter limiter (`auth-strict`) than the rest of the API
  (`api-general`).
- Run `php artisan route:list --path=api` to see every route with its middleware.

## Testing

Tests run against an in-memory SQLite database, so your development data is never touched.

```bash
php artisan test
```

The suite covers registration and login, product permissions (public listing, admin-only creation, customers blocked),
server-side order pricing, and the verified-purchase review rule.

## Scheduled Tasks

To run the abandoned-order cleanup locally:

```bash
php artisan schedule:work
```

## Design Decisions

- **Server-side pricing:** order totals are calculated from database prices, and a test confirms that tampered client
  prices are ignored.
- **Safe image handling:** on update, the new image is uploaded first and the old one is deleted only after the database
  update succeeds.
- **Driver-agnostic cache invalidation:** product lists are cached under a version number, and any create, update or
  delete bumps the version instead of scanning cache keys.
- **AI that never blocks the shop:** recommendation failures fall back to same-category products, and AI error details
  are shown only when `APP_DEBUG=true`.

## Deployment Notes for the Testers/Users

When deploying (for example to Laravel Cloud):

- Use a managed database and run `php artisan migrate --force` as a deploy command.
- Set `APP_ENV=production`, `APP_DEBUG=false`, and `CACHE_STORE=database` (or Redis) and `SESSION_DRIVER=database`,
  because the server filesystem does not persist between deploys.
- Store all secrets (Cloudinary, Gemini, mail, payment) in the host's environment settings.
- Use a real transactional email provider instead of the Mailtrap sandbox, which does not deliver to real inboxes.
- Seed the admin user once, with a strong password.
