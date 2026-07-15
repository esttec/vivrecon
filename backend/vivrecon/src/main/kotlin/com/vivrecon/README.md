# Vivrecon Backend

> *"An increase in wealth does not solely depend on higher income, but rather on the reduction of expenditures."*

A Kotlin + Spring Boot 3 REST API for the **Vivrecon** personal finance app.

---

## Stack

| Layer | Technology |
|---|---|
| Language | Kotlin 1.9 / JVM 21 |
| Framework | Spring Boot 3.2 |
| Security | Spring Security + JWT (JJWT 0.12) |
| Database | PostgreSQL 16 |
| Migrations | Flyway |
| Build | Gradle (Kotlin DSL) |

---

## Running locally

```bash
# 1. Start Postgres
docker-compose up db

# 2. Run the backend
./gradlew bootRun
```

Or start everything together:
```bash
docker-compose up --build
```

**Environment variables** (all have defaults for local dev):

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5432/vivrecon` | JDBC URL |
| `DB_USER` | `vivrecon` | DB username |
| `DB_PASS` | `vivrecon` | DB password |
| `JWT_SECRET` | *(dev placeholder)* | Must be ≥32 chars in prod |
| `PORT` | `8080` | Server port |

---

## Authentication flow

```
POST /api/auth/register   { email, password }  → { accessToken, refreshToken, disclaimerAccepted }
POST /api/auth/login      { email, password }  → { accessToken, refreshToken, disclaimerAccepted }
POST /api/auth/refresh    { refreshToken }     → { accessToken, refreshToken, disclaimerAccepted }
POST /api/auth/logout                          → 204
```

All protected endpoints require:
```
Authorization: Bearer <accessToken>
```

---

## Disclaimer (one-time on first login)

```
POST /api/me/disclaimer/accept   → { accepted: true }
```

The mobile app should check `disclaimerAccepted` in the login/register response and show the terms screen if `false`. After the user taps **Accept**, call this endpoint. It is never required again.

---

## API Endpoints

### Me / Profile
```
GET  /api/me
PUT  /api/me/profile       { displayName, currency, monthlyIncome, savingsTargetPercent }
```

### Sessions
```
GET    /api/sessions
DELETE /api/sessions/{id}
```

### Budget (income + expenses — 2 tables in one screen)
```
GET    /api/budget                        # all months
GET    /api/budget/{yearMonth}            # e.g. 2025-04  (creates if missing)
POST   /api/budget/{yearMonth}/lines      { type: INCOME|EXPENSE, category?, description, amount }
PUT    /api/budget/lines/{lineId}
DELETE /api/budget/lines/{lineId}
```

### House (rent, furniture, cleaning, decorations, utilities)
```
GET    /api/house/{yearMonth}
POST   /api/house             { expenseType, name, amount, yearMonth }
PUT    /api/house/{id}
DELETE /api/house/{id}
```

Expense types: `RENT` `FURNITURE` `CLEANING_SUPPLIES` `DECORATIONS` `UTILITIES` `OTHER`

### Eating (meal plan → shopping list → pantry)
```
# Meal plans
GET    /api/eating/meal-plans
POST   /api/eating/meal-plans                      { weekStartDate, weeklyBudget? }
POST   /api/eating/meal-plans/{planId}/entries     { dayOfWeek 1-7, mealType, description }

# Shopping lists (cheapest store is auto-flagged by total price)
POST   /api/eating/meal-plans/{planId}/shopping-lists   { storeName, items: [{productName, quantity, priceEstimate?}] }
PATCH  /api/eating/shopping-items/{itemId}/toggle        # check/uncheck item

# Fridge & cupboard inventory
GET    /api/eating/pantry
POST   /api/eating/pantry     { name, quantity, location: FRIDGE|FREEZER|PANTRY, expiryDate? }
DELETE /api/eating/pantry/{id}
```

### Clothes (natural fabrics, budget-aware)
```
GET    /api/clothes?yearMonth=2025-04
POST   /api/clothes     { itemName, description?, preferredFabric?, maxBudget?, yearMonth }
PATCH  /api/clothes/{id}  { status?, actualPrice?, storeName?, preferredFabric? }
DELETE /api/clothes/{id}
```

Fabric types: `COTTON` `LINEN` `WOOL` `SILK` `BAMBOO` `HEMP` `OTHER_NATURAL` `SYNTHETIC`
Statuses: `NEEDED` → `FOUND` → `PURCHASED`

### Travel (scan offers daily, select cheapest, pick hotel)
```
GET    /api/travel/trips
POST   /api/travel/trips                          { destination, departureFrom?, startDate?, endDate?, totalBudget? }
POST   /api/travel/trips/{tripId}/offers          { offerType, provider, title, price, url? }
POST   /api/travel/trips/{tripId}/offers/{id}/select
PUT    /api/travel/trips/{tripId}/hotel           { selectedHotel, hotelPricePerNight }
PATCH  /api/travel/trips/{tripId}/status?status=BOOKED
DELETE /api/travel/trips/{tripId}
```

Offer types: `FLIGHT` `TRAIN` `BUS` `HOTEL` `PACKAGE`
Trip statuses: `PLANNING` → `BOOKED` → `COMPLETED` | `CANCELLED`

### Savings (10–30% rule)
```
GET /api/savings/{yearMonth}
```
Returns a report: savings amount, savings %, target %, whether you're on track, and the suggested savings amount based on your profile target.

---

## Project structure

```
src/main/kotlin/com/vivrecon/
├── api/                  ← REST controllers
│   ├── AuthController
│   ├── MeController
│   ├── SessionsController
│   ├── UserController
│   ├── SavingsController
│   ├── CategoryControllers   (Budget, House, Eating, Clothes, Travel)
│   └── ApiExceptionHandler
├── domain/               ← JPA entities
├── repo/                 ← Spring Data repositories
├── service/              ← Business logic
│   ├── AuthService
│   ├── UserService
│   ├── BudgetService
│   ├── SavingsService
│   └── CategoryServices  (House, Eating, Clothing, Travel)
├── security/             ← JWT filter + config
│   ├── JwtUtil
│   ├── JwtAuthFilter
│   └── SecurityConfig
└── config/
    ├── JacksonConfig
    └── TokenCleanupJob   ← nightly expired token purge
```
