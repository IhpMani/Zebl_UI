# BACKEND CONNECTION CONTEXT — EZClaim (Angular Frontend)

The backend API is COMPLETE and already implemented in .NET.
Frontend must ONLY consume existing APIs.
No backend logic should be recreated or guessed.

---

## BACKEND BASE URL

Assume backend runs at:

http://localhost:5000

All API calls are relative to this base URL.

---

## AVAILABLE API ENDPOINTS (READ-ONLY)

Claims:
- GET /api/claims
  - Query params:
    - page
    - pageSize
    - status
    - fromDate
    - toDate

- GET /api/claims/{claId}

Payments:
- GET /api/claims/{claId}/payments

Adjustments:
- GET /api/claims/{claId}/adjustments

These endpoints are FINAL and must be used as-is.

---

## FRONTEND RULES

- Use Angular HttpClient
- Do NOT hardcode URLs in components
- Create API services only:
  - ClaimApiService
  - PaymentApiService
  - AdjustmentApiService

Each service:
- Uses the backend base URL
- Maps query params explicitly
- Returns typed observables

---

## CORS (IMPORTANT)

Backend already allows cross-origin requests.

Angular will run on:
http://localhost:4200

Backend CORS policy allows:
- Any header
- Any method
- Localhost origin

Frontend does NOT need to handle CORS.
No proxy hacks required.

---

## CLAIM LIST INTEGRATION

Claim List grid must:
- Call GET /api/claims
- Pass paging + filter params
- Read response shape:

{
  success: true,
  data: [],
  meta: {
    page,
    pageSize,
    totalCount
  }
}

Grid must NOT assume total count from array length.

---

## COLUMN MAPPING (DO NOT INFER)

Frontend column configs map to backend fields explicitly, for example:

- Claim ID → claID
- Claim Status → claStatus
- Total Charge → claTotalChargeTRIG
- Total Balance → claTotalBalanceCC
- Created Date → claDateTimeCreated

No auto-mapping, no reflection, no magic.

---

## GOAL

Generate Angular services and components that:
- Explicitly call backend APIs
- Respect paging/filter contracts
- Display data in enterprise grid
- Do NOT attempt to recreate backend logic

This is a professional billing workstation, not a demo app.
