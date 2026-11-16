# Stripe Tipping & Monetization Specification

## 1. Overview & Objective
MockSignal offers calibrated, objective mock interview rubrics and candidate feedback. Currently, tipping is strictly framed around 1:1 mentorship sessions. 

The goal of this specification is to:
1. Transition the tipping product into a unified model that supports both **individual 1:1 mentor care** and **MockSignal platform development** (hosting, infrastructure, and open-source tooling).
2. Document the step-by-step Stripe Dashboard configuration so the payment link is generated consistently.
3. Define the exact copy, touchpoints, and UTM attribution across the web app and email templates.

---

## 2. Stripe Dashboard Configuration Guide

When creating the new Payment Link in your [Stripe Dashboard](https://dashboard.stripe.com/):

### Step 1: Create the Product
* **Navigation**: **Product catalog** → **+ Add product**
* **Name**: `MockSignal`
* **Description**:
  > *Support the care, time, and dedication put into calibrated 1:1 mock interview evaluations and making MockSignal the go-to feedback platform for engineers.*
* **Image / Icon**:
  - Upload `mocksignal-icon.png` (Stripe requires raster PNG/JPG; 512×512 recommended).
* **Tax Category / Product Type**:
  - Select **General - electronically supplied services** (or *Software as a service / Digital services*). Since MockSignal is a web software platform and not a registered 501(c)(3) charity, Stripe classifies platform tips and developer support under digital/online services.

### Step 2: Configure Pricing Model
* **Payment Type**: One-time payment
* **Pricing Model**: **Customer chooses what to pay** (*Pay what you want*)
* **Currency**: `USD ($)`
* **Suggested Amounts (Presets)**:
  - Preset 1: `$15` (e.g. *"Coffee on me ☕"*)
  - Preset 2: `$25` (e.g. *"Session supporter 🚀"*)
  - Preset 3: `$50` (e.g. *"Super supporter ⭐"*)
* **Minimum amount**: `$5.00`

### Step 3: Create Payment Link
* **Navigation**: **Payment links** → **+ New**
* Select the **MockSignal** product created above.
* **Confirmation Page**: Show confirmation page (default Stripe message or custom redirect to your platform URL, e.g. `https://your-domain.com`).
* **Copy Link**: Generates a URL in the form of `https://buy.stripe.com/your_payment_link_id`.

---

## 3. Application Touchpoints & Copy

### A. Candidate Scorecard ([`src/pages/PublicScorecardPage.tsx`](file:///Users/karthik/Desktop/interview-feedback/src/pages/PublicScorecardPage.tsx))
* **Placement**: Callout card right below the feedback and action items sections.
* **Headline**: `Loving MockSignal?`
* **Body Copy**:
  > Feel free to leave a **tip on Stripe** — it directly supports the care and effort put into making MockSignal the go-to mock interview feedback platform.
* **Button Text**: `Leave a Tip 💸`
* **Link Target**:
  ```text
  {STRIPE_TIP_URL}?utm_source=mocksignal&utm_medium=web&utm_campaign=candidate_scorecard&utm_content=stripe_tip_scorecard
  ```

### B. Transactional Evaluation Email ([`functions/api/send-report.ts`](file:///Users/karthik/Desktop/interview-feedback/functions/api/send-report.ts))
* **Placement**: Callout box within the HTML email dispatched to candidates via Resend.
* **Email Copy**:
  > 💸 **Loving MockSignal?** Feel free to leave a [tip on Stripe](${stripeTipUrl}) — it directly supports the care put into each evaluation and making MockSignal the go-to mock interview platform for candidates.
* **Link Target**:
  ```text
  {STRIPE_TIP_URL}?utm_source=mocksignal&utm_medium=email&utm_campaign=interview_evaluation&utm_content=stripe_tip_email
  ```

### C. Landing Page Footer ([`src/pages/HomePage.tsx`](file:///Users/karthik/Desktop/interview-feedback/src/pages/HomePage.tsx)) *(Optional)*
* **Placement**: Bottom footer for general site visitors.
* **Copy**:
  > Loving MockSignal? [Support the platform ☕]({STRIPE_TIP_URL}?utm_source=mocksignal&utm_medium=web&utm_campaign=landing_footer&utm_content=stripe_tip_footer)

---

## 4. Codebase Integration Checklist

Once the new Stripe URL is generated:

1. **Update Constant ([`src/lib/constants.ts`](file:///Users/karthik/Desktop/interview-feedback/src/lib/constants.ts))**:
   ```ts
   export const DEFAULT_STRIPE_TIP_URL = 'https://buy.stripe.com/your_stripe_payment_link_id';
   ```
2. **Update Environment Files**:
   - [`.env.example`](file:///Users/karthik/Desktop/interview-feedback/.env.example): `VITE_STRIPE_TIP_URL=https://buy.stripe.com/your_stripe_payment_link_id`
   - [`wrangler.json`](file:///Users/karthik/Desktop/interview-feedback/wrangler.json): `"STRIPE_TIP_URL": "https://buy.stripe.com/your_stripe_payment_link_id"`
3. **Verify Tests**:
   - Run `yarn test` to confirm URL builders and attribution parameter integrity.

