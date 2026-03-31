# How Pricing Works

## What happens when you edit a price

1. A **new Stripe Price** is created with the updated amount (Stripe prices are immutable, so a new one is always created).
2. The previous Stripe Price is **deactivated** so it can no longer be used for new checkouts.
3. The new Stripe Price ID is saved to the shared `plan_pricing` database table.
4. The DEV application reads the `plan_pricing` table at checkout to get the current Stripe Price ID.

## Impact on existing subscribers

- Existing subscribers **keep their current price** until their subscription is manually updated in Stripe.
- Only **new subscriptions** will use the updated price.
- To migrate existing subscribers, use the Stripe Dashboard or Stripe API to update their subscription's price.

## Adding a new category

- Click "Add Category" to create a new plan tier.
- For paid plans, a **Stripe Product** and **Stripe Price** are automatically created.
- Free plans (price = 0) do not create Stripe resources.
- After adding, update the DEV app's checkout flow to include the new plan as an option.

## DEV app integration

The DEV (frontend) application reads the Stripe Price ID directly from the shared `plan_pricing` database table. When you update a price in the admin panel, the new Stripe Price ID is saved to the database and the DEV app's checkout flow automatically uses the updated price — no env variable changes or redeployment needed.

The relevant function is `getStripePriceId()` in `dev/src/lib/stripe/config.server.ts`, which queries the `plan_pricing` table at checkout time.

> **Note:** The display price shown on the DEV app's payment page (e.g. "£599/month") is driven by the `plan_pricing` store in `dev/src/lib/stores/pricing.ts`, which also reads from the same database table.
