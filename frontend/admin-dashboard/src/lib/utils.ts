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

// Utility function to format numbers for Arabic/RTL
export function formatNumberForLocale(number: number, locale: string): string {
  if (locale === "ar") {
    // Use Intl.NumberFormat for proper Arabic number formatting
    return new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(number);
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number);
}

// Utility function to format currency for Arabic/RTL
export function formatCurrencyForLocale(
  amount: number,
  locale: string
): string {
  if (locale === "ar") {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Utility function to format percentages for Arabic/RTL
export function formatPercentageForLocale(
  value: number,
  locale: string,
  decimals: number = 1
): string {
  if (locale === "ar") {
    const formattedNumber = new Intl.NumberFormat("ar-EG", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    }).format(value);
    return `${formattedNumber}%`;
  }
  const formattedNumber = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
  return `${formattedNumber}%`;
}

// Utility function to format phone numbers for Arabic/RTL
export function formatPhoneNumberForLocale(
  phoneNumber: string,
  locale: string
): string {
  if (locale === "ar") {
    // For Arabic, we want to keep the phone number in LTR direction
    // but ensure it's properly formatted for RTL layout
    return phoneNumber;
  }
  return phoneNumber;
}
