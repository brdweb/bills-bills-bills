# BillManager Go-To-Market Plan

## Executive Summary

This plan outlines the steps needed to bring BillManager to market as a SaaS product with mobile apps. The codebase already has solid foundations (Stripe integration, JWT API, multi-tenancy) but needs feature gating, documentation, analytics, and mobile apps.

---

## SaaS vs Self-Hosted Scope

**Important**: BillManager supports two deployment modes. Features must respect this distinction:

| Feature | SaaS Mode | Self-Hosted Mode |
|---------|-----------|------------------|
| Stripe Billing | Yes | No |
| Subscription Tiers/Limits | Yes | No (unlimited) |
| Umami Analytics | Yes | No |
| Feature Gating | Yes | No |
| User Registration | Yes | Optional |
| Documentation | Hosted docs | Links to hosted docs |

**Implementation Pattern**:
- All subscription/billing checks wrapped in `if ENABLE_BILLING:`
- Analytics scripts only injected when `DEPLOYMENT_MODE == 'saas'`
- Self-hosted users get all features unlimited
- Documentation hosted centrally, accessible to both modes

---

## Phase 1: Stripe Production Setup & Feature Restrictions (SaaS Only)

> **Note**: Stripe integration and feature restrictions only apply in SaaS mode (`DEPLOYMENT_MODE=saas`).

### 1.1 Stripe Product Configuration
**Goal**: Set up production Stripe account with tiered products matching marketing site pricing.

**Products to Create in Stripe Dashboard**:
| Plan | Monthly Price | Annual Price | Stripe Price IDs Needed |
|------|--------------|--------------|------------------------|
| Free | $0 | $0 | None (no Stripe) |
| Basic | $5/mo | $50/yr | 2 price IDs |
| Plus | $7.50/mo | $75/yr | 2 price IDs |

**Implementation Steps**:
1. Create products in Stripe Dashboard (Production)
2. Create price objects for monthly and annual billing
3. Update environment variables:
   - `STRIPE_SECRET_KEY` (production key)
   - `STRIPE_PUBLISHABLE_KEY` (production key)
   - `STRIPE_WEBHOOK_SECRET` (new webhook endpoint)
4. Store multiple price IDs in config (currently only supports one)

**Files to Modify**:
- `server/config.py` - Add STRIPE_PRICES dict for multiple tiers
- `server/services/stripe_service.py` - Support tier selection in checkout
- `server/app.py` - Update checkout endpoint for plan selection

### 1.2 Feature Restrictions by Tier
**Goal**: Gate features based on subscription tier.

**Tier Limits**:
| Feature | Free | Basic | Plus |
|---------|------|-------|------|
| Bills | 10 | Unlimited | Unlimited |
| Users | 1 | 2 | 5 |
| Bill Groups | 1 | 1 | 3 |
| Payment History | Yes | Yes | Yes |
| Analytics Charts | Basic | Full | Full |
| Export | No | Yes | Yes |
| Priority Support | No | No | Yes |

**Implementation Steps**:
1. Add `tier` column to Subscription model (free/basic/plus)
2. Create `@subscription_required(tier='basic')` decorator
3. Add usage tracking columns: `bill_count`, `user_count`, `bill_group_count`
4. Implement limit checks before creating bills/users/workspaces
5. Return 403 with upgrade prompt when limits exceeded
6. Add UI indicators for limits (e.g., "3/10 bills used")

**Files to Modify**:
- `server/models.py` - Add tier field and usage tracking
- `server/app.py` - Add limit enforcement decorators
- `client/src/components/BillModal.tsx` - Show limit warnings
- `client/src/pages/Billing.tsx` - Show usage vs limits

### 1.3 Trial Expiration Enforcement
**Goal**: Handle trial expiration gracefully.

**Current State**: 14-day trial created but never enforced.

**Implementation**:
1. Check `trial_ends_at` on each authenticated request
2. If expired and no active subscription, downgrade to Free tier limits
3. Show banner: "Your trial has expired. Upgrade to continue."
4. Allow basic read access but block new bill creation beyond Free limits

---

## Phase 2: Marketing Website Completion

### 2.1 Terms of Service Page
**Goal**: Legal protection for SaaS operation.

**Content Required**:
- Acceptance of terms
- Account registration and security
- Subscription and billing terms
- Cancellation and refund policy
- Limitation of liability
- Data ownership and privacy reference
- Termination rights
- Governing law

**Files to Create**:
- `billmanager-marketing/src/pages/terms.astro`

### 2.2 Privacy Policy Page
**Goal**: GDPR/CCPA compliance.

**Content Required**:
- Data collection (what we collect)
- Data usage (how we use it)
- Data storage (where, how long)
- Third-party services (Stripe, Umami, email provider)
- User rights (access, deletion, export)
- Cookie policy
- Contact information

**Files to Create**:
- `billmanager-marketing/src/pages/privacy.astro`

### 2.3 Features Page with Full Feature List
**Goal**: Detailed feature showcase for marketing.

**Content Structure**:
- Hero with key value props
- Feature categories:
  - Bill & Income Tracking
  - Payment Management
  - Analytics & Insights
  - Multi-User & Sharing
  - Security & Privacy
- Comparison table (Free vs Basic vs Plus)
- Screenshots/demos
- FAQ section

**Files to Create**:
- `billmanager-marketing/src/pages/features.astro`

### 2.4 Navigation & Footer Updates
**Files to Modify**:
- `billmanager-marketing/src/layouts/Layout.astro` - Add nav header
- `billmanager-marketing/src/pages/index.astro` - Update footer links

---

## Phase 3: Documentation Strategy

### 3.1 Documentation Platform Decision

**Options Evaluated**:

| Platform | Pros | Cons | Mobile-Friendly |
|----------|------|------|-----------------|
| **Docusaurus** | React-based, versioning, search | Separate deploy | Yes (responsive) |
| **GitBook** | Beautiful, hosted | Vendor lock-in, cost | Yes |
| **MkDocs** | Simple, Material theme | Less features | Yes |
| **In-App Help** | Contextual, no navigation | Maintenance burden | Built-in |
| **Astro (marketing)** | Same stack, unified | Not specialized | Yes |

**Recommendation**: **Docusaurus** hosted at `docs.billmanager.app`
- React-based (matches main app)
- Excellent search (Algolia integration)
- Mobile-responsive out of box
- Can embed in mobile apps via WebView
- Version documentation for API changes
- MDX support for interactive examples

### 3.2 Documentation Structure

```
docs.billmanager.app/
├── Getting Started
│   ├── Quick Start Guide
│   ├── Creating Your First Bill
│   └── Understanding Workspaces
├── Features
│   ├── Bill Management
│   ├── Payment Tracking
│   ├── Analytics & Reports
│   ├── Sharing with Family
│   └── Auto-Payments
├── Account & Billing
│   ├── Subscription Plans
│   ├── Managing Your Account
│   └── Cancellation & Refunds
├── API Reference
│   ├── Authentication
│   ├── Bills Endpoints
│   ├── Payments Endpoints
│   └── Webhooks
└── Mobile Apps
    ├── iOS Guide
    ├── Android Guide
    └── Syncing & Offline
```

### 3.3 Implementation Steps
1. Initialize Docusaurus project in `billmanager-docs` repo
2. Configure for `docs.billmanager.app` deployment
3. Write initial documentation (10-15 pages)
4. Set up Algolia DocSearch
5. Add link from main app header ("Help" or "?")
6. Embed key pages in mobile app WebViews

---

## Phase 4: Analytics with Umami (SaaS Only)

> **Note**: Analytics tracking is SaaS-only. Self-hosted installations do not include analytics scripts.

### 4.1 Umami Setup on Coolify

**Deployment**:
- Deploy Umami on same Coolify instance
- Subdomain: `analytics.billmanager.app`
- PostgreSQL database (can share or separate)

**Docker Compose Addition**:
```yaml
umami:
  image: ghcr.io/umami-software/umami:postgresql-latest
  environment:
    DATABASE_URL: postgresql://...
    HASH_SALT: random-string
  ports:
    - "3000:3000"
```

### 4.2 Integration Points

**Main App (`client/index.html`)**:
```html
<script async src="https://analytics.billmanager.app/script.js"
        data-website-id="xxx"></script>
```

**Marketing Site (`Layout.astro`)**:
```html
<script async src="https://analytics.billmanager.app/script.js"
        data-website-id="yyy"></script>
```

**Custom Events to Track**:
- User registration
- Bill created
- Payment recorded
- Subscription started
- Plan upgraded/downgraded
- Feature usage (exports, charts, etc.)

### 4.3 Privacy Considerations
- Umami is privacy-focused (no cookies, GDPR-compliant)
- Mention in Privacy Policy
- No PII in custom events

---

## Phase 5: Export & Print Functionality

### 5.1 Bill List Export

**Export Formats**:
- CSV (primary)
- PDF (formatted table)

**Implementation**:
1. Add "Export" button to BillList header
2. Options: "Export as CSV" / "Export as PDF"
3. Include filters in export (if applied)

**Libraries**:
- CSV: Native JavaScript (no library needed)
- PDF: `@react-pdf/renderer` or `jspdf` + `jspdf-autotable`

**Files to Modify**:
- `client/src/components/BillList.tsx` - Add export button
- `client/src/utils/export.ts` - New file for export logic

### 5.2 Payments Export

**Same approach for AllPayments page**:
- Export filtered results
- Include date range in filename
- Columns: Bill Name, Date, Amount, Type

**Files to Modify**:
- `client/src/pages/AllPayments.tsx` - Add export button

### 5.3 Print Styling
- Add `@media print` CSS rules
- Hide nav, sidebar, action buttons when printing
- Format tables for paper

---

## Phase 6: Terminology Update (Databases → Bill Groups)

### 6.1 User-Facing Changes

**Current → New**:
- "Database" → "Bill Group"
- "Select database" → "Select bill group"
- "Databases" tab → "Bill Groups" tab
- "Create database" → "Create bill group"

**Why "Bill Group"**:
- Domain-specific and intuitive for the app's purpose
- Clear meaning without technical jargon
- Works well for personal finance context ("Personal Bills", "Household Bills", etc.)

### 6.2 Implementation Scope

**Files to Modify (UI only, keep DB model names)**:
- `client/src/components/Layout.tsx` - Dropdown label
- `client/src/components/AdminPanel/DatabasesTab.tsx` - Rename to BillGroupsTab
- `client/src/components/AdminPanel/AdminModal.tsx` - Tab label
- `client/src/api/client.ts` - Type aliases (optional)

**Keep Internal Names**:
- Database model in `models.py` (avoid migration)
- API endpoints `/databases` (backwards compatible)
- Only change user-facing strings

### 6.3 Gradual Rollout
- Start with UI labels
- Update documentation
- Consider API v3 for cleaner naming (future)

---

## Phase 7: Subscription Enforcement in App (SaaS Only)

> **Note**: Subscription enforcement only applies in SaaS mode. Self-hosted users have unlimited access to all features.

### 7.1 Backend Enforcement

**Decorator Pattern**:
```python
@app.route('/bills', methods=['POST'])
@login_required
@subscription_required(min_tier='free', feature='create_bill')
def create_bill():
    # Check bill count against tier limit
    pass
```

**Limit Checking Utility**:
```python
def check_tier_limits(user, feature):
    tier = get_user_tier(user)
    limits = TIER_LIMITS[tier]
    current_usage = get_usage(user, feature)
    return current_usage < limits[feature]
```

### 7.2 Frontend Enforcement

**Usage Display Component**:
```tsx
<UsageIndicator
  used={billCount}
  limit={tierLimits.bills}
  feature="bills"
/>
```

**Upgrade Prompts**:
- Modal when limit reached
- "Upgrade to Basic for unlimited bills"
- Link to billing page

### 7.3 Grace Period Handling
- Allow existing data above limits (don't delete)
- Block new creations only
- Show "You're over your limit" warning

---

## Phase 8: API Mobile Readiness Verification

### 8.1 Current State (Already Good)
- JWT authentication ✓
- Standardized responses ✓
- Rate limiting ✓
- Device tracking ✓
- Token refresh flow ✓

### 8.2 Enhancements Needed

**Pagination**:
- Add `page` and `limit` params to list endpoints
- Return `total`, `page`, `pages` in response
- Default: 50 items per page

**Files to Modify**:
- `server/app.py` - Add pagination to GET /bills, GET /payments

**Compression**:
- Enable gzip for responses > 1KB
- Already handled by gunicorn/nginx in production

**Offline Considerations**:
- Document sync strategy in API docs
- Add `updated_at` to responses for delta sync
- Consider adding `/sync` endpoint for batch updates

---

## Phase 9: Mobile App Technology Research

### 9.1 Cross-Platform Options

| Framework | Pros | Cons | Recommendation |
|-----------|------|------|----------------|
| **React Native** | Same JS/React skills, large ecosystem | Bridge overhead, native modules complexity | **Best fit** |
| **Flutter** | Fast, beautiful UI, single codebase | Dart learning curve, larger app size | Good alternative |
| **Expo (React Native)** | Easier setup, OTA updates, managed workflow | Limited native access, ejection needed for some features | **Start here** |
| **Capacitor** | Reuse web code, web view hybrid | Performance limits, less native feel | Quick MVP option |
| **Native (Swift/Kotlin)** | Best performance, full platform access | 2x development effort, different codebases | Future consideration |

### 9.2 Recommendation: Expo (React Native)

**Why Expo**:
1. Team knows React/TypeScript (from web app)
2. Managed workflow handles builds, signing, updates
3. Can eject to bare React Native if needed
4. OTA updates for quick fixes
5. Excellent documentation

**Shared Code Potential**:
- API client (`client/src/api/client.ts`)
- Type definitions
- Business logic (validation, calculations)
- Could extract to shared npm package

### 9.3 Mobile App MVP Features
1. Login/authentication
2. View bills list
3. Record payments
4. View payment history
5. Push notifications for due dates
6. Offline viewing (sync when online)

---

## Phase 10: Desktop App Technology Research

### 10.1 Cross-Platform Options

| Framework | Pros | Cons | Recommendation |
|-----------|------|------|----------------|
| **Electron** | Full web reuse, mature ecosystem | Memory heavy, large bundle | Quick win |
| **Tauri** | Rust-based, smaller bundles, better performance | Rust knowledge needed, younger ecosystem | **Best long-term** |
| **Flutter Desktop** | Same as mobile Flutter | Dart, less mature desktop support | If using Flutter mobile |
| **PWA** | Zero build, install from browser | Limited OS integration | **Start here** |

### 10.2 Recommendation: PWA First, Then Tauri

**Phase 1: PWA**
- Add service worker to existing React app
- Enable "Install App" prompt
- Works on Windows, macOS, Linux, ChromeOS
- Minimal development effort

**Phase 2: Tauri (Later)**
- When native features needed (system tray, shortcuts, auto-launch)
- Wrap existing React app
- Much smaller than Electron (~10MB vs 150MB+)

### 10.3 PWA Implementation Steps
1. Add `manifest.json` with app icons
2. Register service worker for offline caching
3. Add install prompt UI
4. Test on all platforms

**Files to Create**:
- `client/public/manifest.json`
- `client/src/service-worker.ts`

---

## Implementation Priority & Timeline

### Immediate (Pre-Launch Must-Haves)
1. **Stripe Production Setup** - Required for revenue
2. **Terms of Service** - Legal requirement
3. **Privacy Policy** - Legal requirement
4. **Feature Restrictions** - Enforce subscription value

### Short-Term (Launch Quality)
5. **Umami Analytics** - Track usage from day 1
6. **Terminology Update** - Better UX
7. **Export Features** - Key user request
8. **Documentation Site** - Reduce support burden

### Medium-Term (Growth)
9. **Mobile App (Expo)** - Expand reach
10. **PWA Support** - Desktop presence

### Long-Term (Scale)
11. **Native Desktop (Tauri)** - Power users
12. **API Pagination** - Performance at scale

---

## Files Reference

### Backend Modifications
- `server/app.py` - Subscription enforcement, pagination
- `server/models.py` - Tier fields, usage tracking
- `server/config.py` - Multi-tier Stripe config
- `server/services/stripe_service.py` - Plan selection

### Frontend Modifications
- `client/src/components/BillList.tsx` - Export, limits
- `client/src/pages/AllPayments.tsx` - Export
- `client/src/pages/Billing.tsx` - Usage display, tier selection
- `client/src/components/Layout.tsx` - Workspace terminology
- `client/index.html` - Umami script, PWA manifest

### New Repositories/Projects
- `billmanager-docs` - Docusaurus documentation
- `billmanager-mobile` - Expo React Native app
- Umami deployment on Coolify

### Marketing Site
- `src/pages/terms.astro` - Terms of Service
- `src/pages/privacy.astro` - Privacy Policy
- `src/pages/features.astro` - Full feature list
- `src/layouts/Layout.astro` - Navigation, Umami script (SaaS only)

---

## Plan Storage

This plan document should be saved to the project for future reference:
- **Main repo**: `/home/brdweb/Documents/AI/billmanager/docs/GO_TO_MARKET_PLAN.md`
