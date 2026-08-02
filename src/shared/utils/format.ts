/**
 * Formats a numeric amount as currency (default USD)
 */
export const formatCurrency = (amount: number, currency = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

/**
 * Formats distance with the correct unit label
 */
export const formatDistance = (distance: number, useMetric = false): string => {
  const unit = useMetric ? "km" : "mi";
  return `${distance.toFixed(1)} ${unit}`;
};

/**
 * Formats a duration in seconds to a human-readable duration (e.g. 15 mins, 1 hr 20 mins)
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return "under a min";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min${minutes > 1 ? "s" : ""}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr${hours > 1 ? "s" : ""}`;
  }
  return `${hours} hr${hours > 1 ? "s" : ""} ${remainingMinutes} min${remainingMinutes > 1 ? "s" : ""}`;
};

/**
 * Formats ISO date timestamps to a simple short date and time (e.g., Jun 27, 9:50 AM)
 */
export const formatDate = (isoString: string | null | undefined): string => {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch (e) {
    return "";
  }
};

/**
 * Formats phone numbers to standard format: (XXX) XXX-XXXX
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return "";
  const cleaned = ("" + phone).replace(/\D/g, "");
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return "(" + match[1] + ") " + match[2] + "-" + match[3];
  }
  return phone;
};

/**
 * Formats ISO date timestamps to a simple short date and time using India locale (en-IN)
 */
export const formatDateIN = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return dateStr;
  }
};
