import { NOTIFICATION_LEVELS } from "../app/constants.js";
import { createId } from "../app/utils.js";

const DEFAULT_NOTIFICATION_TTL = 5500;

export function getNotificationExpiry(item) {
  if (!item || item.sticky) {
    return null;
  }

  if (typeof item.expiresAt === "number") {
    return item.expiresAt;
  }

  const createdAt = Date.parse(item.createdAt || "");
  if (Number.isFinite(createdAt)) {
    return createdAt + DEFAULT_NOTIFICATION_TTL;
  }

  return Date.now() - 1;
}

export function isNotificationVisible(item, now = Date.now()) {
  if (!item || item.read) {
    return false;
  }

  const expiry = getNotificationExpiry(item);
  return expiry === null || expiry > now;
}

export function pushNotification(store, notification) {
  const now = Date.now();
  const sticky = notification.sticky === true;
  const item = {
    id: notification.id || createId("notif"),
    title: notification.title,
    message: notification.message,
    level: notification.level || NOTIFICATION_LEVELS.INFO,
    createdAt: new Date().toISOString(),
    expiresAt: sticky ? undefined : now + (notification.ttl ?? DEFAULT_NOTIFICATION_TTL),
    sticky,
    read: false
  };

  store.setState((state) => {
    state.notifications.items.unshift(item);
    state.notifications.items = state.notifications.items.slice(0, 20);
  }, { silent: true });

  return item;
}

export function getVisibleNotifications(state) {
  const now = Date.now();
  return state.notifications.items.filter((item) => isNotificationVisible(item, now));
}

export function markNotificationRead(store, notificationId) {
  store.setState((state) => {
    const notification = state.notifications.items.find((item) => item.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }, { silent: true });
}

export function dismissNotification(store, notificationId) {
  store.setState((state) => {
    state.notifications.items = state.notifications.items.filter((item) => item.id !== notificationId);
  }, { silent: true });
}

export function dismissNotifications(store, predicate = () => true) {
  let changed = false;

  store.setState((state) => {
    const nextItems = state.notifications.items.filter((item) => {
      const remove = predicate(item);
      if (remove) {
        changed = true;
      }
      return !remove;
    });

    if (changed) {
      state.notifications.items = nextItems;
    }
  }, { silent: true });

  return changed;
}

export function dismissVisibleNotifications(store, predicate = () => true) {
  const now = Date.now();
  return dismissNotifications(store, (item) => isNotificationVisible(item, now) && predicate(item));
}

export function sweepExpiredNotifications(store) {
  const now = Date.now();
  let changed = false;

  store.setState((state) => {
    const nextItems = state.notifications.items.filter((item) => {
      const keep = isNotificationVisible(item, now);
      if (!keep) {
        changed = true;
      }
      return keep;
    });

    if (changed) {
      state.notifications.items = nextItems;
    }
  }, { silent: true });

  return changed;
}

export function unreadNotificationCount(state) {
  return getVisibleNotifications(state).length;
}
