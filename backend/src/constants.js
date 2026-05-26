const ONLINE_WINDOW_MS = 120_000
// Per-user cooldown: prevents the same user from starting the same trail too quickly.
// Set RACE_COOLDOWN_MINUTES=0 in .env to disable for testing.
const COOLDOWN_MS = parseInt(process.env.RACE_COOLDOWN_MINUTES ?? '60') * 60_000
// Session grouping window: runs starting within this window share a session.
// Always 1 hour regardless of cooldown setting.
const SESSION_WINDOW_MS = 3_600_000
const DEFAULT_RADIUS = 50

module.exports = { ONLINE_WINDOW_MS, COOLDOWN_MS, SESSION_WINDOW_MS, DEFAULT_RADIUS }
