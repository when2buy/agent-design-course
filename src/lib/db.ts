import { createClient } from '@supabase/supabase-js'

// Server-side only — NEVER import in client components
// Uses service role key which bypasses RLS
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type User = {
  id: string
  email: string
  name: string | null
  passwordHash: string
  role: string
  subscriptionStatus: string
  subscriptionEndsAt: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  createdAt: string
  updatedAt: string
}

export async function getUser(email: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()
  if (error || !data) return null
  return data as User
}

export async function getUserById(id: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !data) return null
  return data as User
}

export async function updateUser(id: string, data: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>): Promise<User | null> {
  const { data: updated, error } = await supabase
    .from('users')
    .update(data)
    .eq('id', id)
    .select()
    .single()
  if (error || !updated) return null
  return updated as User
}

export async function createUser(data: { email: string; name: string; passwordHash: string }): Promise<User> {
  const { data: created, error } = await supabase
    .from('users')
    .insert(data)
    .select()
    .single()
  if (error || !created) throw new Error(error?.message ?? 'Failed to create user')
  return created as User
}

export async function listUsers(): Promise<Partial<User>[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, subscriptionStatus, subscriptionEndsAt, createdAt')
    .order('createdAt', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Partial<User>[]
}
