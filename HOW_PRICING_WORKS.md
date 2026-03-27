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

The DEV application should read from the `plan_pricing` table instead of using hardcoded price IDs. Update the DEV app's `getStripePriceId()` function in `src/lib/stripe/config.server.ts` to query this table. This way, price changes here are automatically reflected in the customer checkout flow.

> **Important:** The display price shown on the DEV app's payment page (e.g. "£599/month" in the Founder plan card) is currently hardcoded in the DEV app's `FOUNDER_PLAN` config. After changing a price here, also update the display value in the DEV app's `src/lib/census/config.ts` to keep them in sync.
