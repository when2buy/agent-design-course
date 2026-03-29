-- Seed data for development/demo
-- admin@agentcourse.ai / admin123
-- pro@demo.com / demo123

INSERT INTO users (email, name, "passwordHash", role, "subscriptionStatus")
VALUES
  (
    'admin@agentcourse.ai',
    'Admin',
    '$2b$10$eMHQYJ7Eem9Yifmf.pA4tOhfYHsaRMHfb24z7Hs/yiXcEkWkMwcGm',
    'admin',
    'pro'
  ),
  (
    'pro@demo.com',
    'Pro Demo',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC3.9e6GmhEa3KBCNLiS',
    'user',
    'pro'
  )
ON CONFLICT (email) DO NOTHING;
