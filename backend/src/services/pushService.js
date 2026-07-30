const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

// In-memory subscription store (keyed by userId)
const subscriptions = new Map();
const appName = process.env.APP_NAME || 'Loan App';
const appUrl = process.env.APP_PUBLIC_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
const subscriptionsFilePath = path.resolve(__dirname, '../../data/push-subscriptions.json');
let pushEnabled = false;

function ensureSubscriptionsStorePath() {
  const dir = path.dirname(subscriptionsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function persistSubscriptions() {
  try {
    ensureSubscriptionsStorePath();
    const payload = JSON.stringify(Object.fromEntries(subscriptions), null, 2);
    fs.writeFileSync(subscriptionsFilePath, payload, 'utf8');
  } catch (error) {
    console.error('[Push] Failed to persist subscriptions:', error.message);
  }
}

function loadSubscriptions() {
  try {
    ensureSubscriptionsStorePath();
    if (!fs.existsSync(subscriptionsFilePath)) {
      return;
    }

    const raw = fs.readFileSync(subscriptionsFilePath, 'utf8');
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    const entries = Object.entries(parsed || {});
    for (const [userId, subscription] of entries) {
      if (subscription && subscription.endpoint) {
        subscriptions.set(String(userId), subscription);
      }
    }

    console.log(`[Push] Restored ${subscriptions.size} subscription(s) from disk.`);
  } catch (error) {
    console.error('[Push] Failed to load subscriptions:', error.message);
  }
}

function configure() {
  const publicKey = String(process.env.VAPID_PUBLIC_KEY || '').trim();
  const privateKey = String(process.env.VAPID_PRIVATE_KEY || '').trim();

  if (!publicKey || !privateKey) {
    pushEnabled = false;
    console.warn('[Push] VAPID keys are missing. Push notifications are disabled.');
    return false;
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@extracash.mkopaji.com',
    publicKey,
    privateKey
  );

  loadSubscriptions();
  pushEnabled = true;
  return true;
}

function isEnabled() {
  return pushEnabled;
}

function saveSubscription(userId, subscription) {
  subscriptions.set(String(userId), subscription);
  persistSubscriptions();
}

function removeSubscription(userId) {
  subscriptions.delete(String(userId));
  persistSubscriptions();
}

async function sendNotification(subscription, payload) {
  if (!pushEnabled) {
    return false;
  }

  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    // 410 Gone = subscription expired/unsubscribed
    if (err.statusCode === 410) {
      return 'gone';
    }
    console.error('Push send error:', err.message);
    return false;
  }
}

async function sendToUser(userId, payload) {
  if (!pushEnabled) return false;

  const sub = subscriptions.get(String(userId));
  if (!sub) return 'not_subscribed';
  const result = await sendNotification(sub, payload);
  if (result === 'gone') {
    subscriptions.delete(String(userId));
    persistSubscriptions();
  }
  return result;
}

const HOURLY_MESSAGES = [
  { title: 'Reminder', body: 'A quick reminder from Extra Cash: check your loan options anytime.' },
  { title: 'Friendly Reminder', body: 'Your next loan opportunity is still waiting. Open the app to see what you qualify for.' },
  { title: 'Extra Cash Update', body: 'Need support today? Visit the app and explore your loan options.' },
  { title: 'Reminder', body: 'Just a friendly reminder to keep your loan plans moving forward.' },
  { title: 'Extra Cash', body: 'Your next financial step is just a tap away. Open the app anytime.' },
  { title: 'Reminder', body: 'Stay on top of your plans with a quick check-in from Extra Cash.' },
  { title: 'Extra Cash', body: 'We are here to help with fast support whenever you need it.' },
  { title: 'Friendly Reminder', body: 'Open the app for the latest loan updates and opportunities.' },
];

let hourlyMessageIndex = 0;

function getNextHourlyMessage() {
  const msg = HOURLY_MESSAGES[hourlyMessageIndex % HOURLY_MESSAGES.length];
  hourlyMessageIndex++;
  return msg;
}

async function broadcastHourlyReminder() {
  if (!pushEnabled) return;
  if (subscriptions.size === 0) return;

  const { title, body } = getNextHourlyMessage();
  const payload = {
    title: title.replace('Tala Mkopo', appName),
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    url: appUrl,
  };

  const stale = [];
  for (const [userId, sub] of subscriptions.entries()) {
    const result = await sendNotification(sub, payload);
    if (result === 'gone') stale.push(userId);
  }
  if (stale.length > 0) {
    stale.forEach((id) => subscriptions.delete(id));
    persistSubscriptions();
  }
}

module.exports = { configure, isEnabled, saveSubscription, removeSubscription, sendToUser, broadcastHourlyReminder };
