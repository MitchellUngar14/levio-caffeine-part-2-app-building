export type NotifyStatus = "granted" | "denied" | "default" | "unsupported";

export function notifyStatus(): NotifyStatus {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function requestNotifications(): Promise<NotifyStatus> {
  if (typeof Notification === "undefined") return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/** Shows a system notification. Returns false when it couldn't, so the caller shows a banner. */
export function showNotification(title: string, body: string): boolean {
  if (notifyStatus() !== "granted") return false;
  try {
    const n = new Notification(title, { body, tag: "caffeine-reminder" });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}
