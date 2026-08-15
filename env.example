export function subscriptionInfo(value) {
  const date = value ? new Date(value) : null;
  const timestamp = date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
  const active = timestamp > Date.now();
  return {
    active,
    until: timestamp ? new Date(timestamp).toISOString() : null,
    remainingDays: active ? Math.max(1, Math.ceil((timestamp - Date.now()) / 86400000)) : 0
  };
}

export function publicUser(row) {
  const subscription = subscriptionInfo(row.subscription);
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role || 'user',
    subscription: subscription.until,
    subscription_active: subscription.active,
    subscription_days: subscription.remainingDays,
    hwid: row.hwid || null,
    avatar: row.avatar || null,
    created_at: row.created_at
  };
}
