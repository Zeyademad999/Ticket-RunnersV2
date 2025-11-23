import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting utilities
export function formatDate(dateString: string, locale: string = "en"): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString; // Return original if invalid date
    }

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2); // Get last 2 digits

    return `${day}/${month}/${year}`;
  } catch (error) {
    return dateString; // Return original if parsing fails
  }
}

export function formatTime(timeString: string, locale: string = "en"): string {
  try {
    // Handle different time formats
    if (timeString.includes(":")) {
      const [hours, minutes] = timeString.split(":");
      const hour = parseInt(hours);
      const minute = minutes || "00";

      if (locale === "ar") {
        // 24-hour format for Arabic
        return `${hour.toString().padStart(2, "0")}:${minute}`;
      } else {
        // 12-hour format for English
        const period = hour >= 12 ? "PM" : "AM";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minute} ${period}`;
      }
    }
    return timeString;
  } catch (error) {
    return timeString;
  }
}

// RTL utilities
export function isRTL(locale: string): boolean {
  return locale === "ar";
}

export function getTextDirection(locale: string): "ltr" | "rtl" {
  return isRTL(locale) ? "rtl" : "ltr";
}

/**
 * Normalize image URL to work with Vite proxy
 * Converts absolute URLs (http://localhost:8000/media/...) to relative URLs (/media/...)
 * Preserves data URLs, relative URLs, and placeholder paths
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  // If no URL, return placeholder
  if (!url || url === "null" || url === "undefined" || url.trim() === "") {
    return "/Portrait_Placeholder.png";
  }

  // If it's already a data URL (base64), return as is
  if (url.startsWith("data:")) {
    return url;
  }

  // If it's already a relative URL starting with /media/, return as is
  if (url.startsWith("/media/")) {
    return url;
  }

  // If it's an absolute URL, extract the path
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch (e) {
    // If URL parsing fails, try to extract /media/ path
    const match = url.match(/\/media\/.*/);
    if (match) {
      return match[0];
    }
    // If it starts with media/ but no leading slash, add it
    if (url.startsWith("media/")) {
      return "/" + url;
    }
    // Otherwise return as is (might be a valid relative URL)
    return url;
  }
}