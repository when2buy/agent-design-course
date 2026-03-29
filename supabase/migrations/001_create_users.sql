CREATE TABLE IF NOT EXISTS users (
  id                     uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  text         NOT NULL UNIQUE,
  name                   text,
  "passwordHash"         text         NOT NULL,
  role                   text         NOT NULL DEFAULT 'user',
  "subscriptionStatus"   text         NOT NULL DEFAULT 'free',
  "subscriptionEndsAt"   timestamptz,
  "stripeCustomerId"     text         UNIQUE,
  "stripeSubscriptionId" text         UNIQUE,
  "stripePriceId"        text,
  "createdAt"            timestamptz  NOT NULL DEFAULT now(),
  "updatedAt"            timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users ("stripeCustomerId");

-- Auto-update updatedAt on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();
