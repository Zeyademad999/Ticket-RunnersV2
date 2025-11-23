/**
 * Validation utilities for authentication and user input
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "medium" | "strong";
}

export interface ValidationRules {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  forbiddenPatterns: RegExp[];
}

// Standard password requirements
export const PASSWORD_RULES: ValidationRules = {
  minLength: 8,
  maxLength: 255,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  forbiddenPatterns: [
    /(.)\1{3,}/, // No more than 3 consecutive identical characters
    /123456/, // No sequential numbers
    /password/i, // No common passwords
    /qwerty/i,
    /admin/i,
  ],
};

export class ValidationService {
  /**
   * Validate password according to security rules
   */
  static validatePassword(
    password: string,
    rules: ValidationRules = PASSWORD_RULES
  ): PasswordValidationResult {
    const errors: string[] = [];
    let strength: "weak" | "medium" | "strong" = "weak";

    // Length validation
    if (password.length < rules.minLength) {
      errors.push(
        `Password must be at least ${rules.minLength} characters long`
      );
    }
    if (password.length > rules.maxLength) {
      errors.push(
        `Password must be no more than ${rules.maxLength} characters long`
      );
    }

    // Character requirements
    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (rules.requireNumbers && !/\d/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (
      rules.requireSpecialChars &&
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ) {
      errors.push("Password must contain at least one special character");
    }

    // Forbidden patterns
    rules.forbiddenPatterns.forEach((pattern) => {
      if (pattern.test(password)) {
        errors.push("Password contains forbidden patterns");
      }
    });

    // Calculate strength
    if (errors.length === 0) {
      const score = this.calculatePasswordStrength(password);
      if (score >= 80) {
        strength = "strong";
      } else if (score >= 60) {
        strength = "medium";
      } else {
        strength = "weak";
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength,
    };
  }

  /**
   * Calculate password strength score (0-100)
   */
  private static calculatePasswordStrength(password: string): number {
    let score = 0;

    // Length score
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 20;

    // Bonus for mixed case and numbers
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 10;
    if (/\d/.test(password) && /[a-zA-Z]/.test(password)) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate phone number format
   */
  static validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,15}$/;
    return phoneRegex.test(phone.trim());
  }

  /**
   * Sanitize user input to prevent XSS
   */
  static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, "") // Remove potential HTML tags
      .replace(/javascript:/gi, "") // Remove javascript: protocol
      .replace(/on\w+=/gi, "") // Remove event handlers
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate JWT token format and signature
   */
  static validateJWT(
    token: string,
    secret?: string
  ): {
    isValid: boolean;
    payload?: any;
    error?: string;
  } {
    try {
      if (!token || typeof token !== "string") {
        return { isValid: false, error: "Token is not a string" };
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        return { isValid: false, error: "Invalid JWT format" };
      }

      // Decode header and payload
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      if (!payload || typeof payload !== "object") {
        return { isValid: false, error: "Invalid token payload" };
      }

      // Don't require 'sub' field - some tokens might use different user identifier fields
      // Just check that payload exists and is an object

      // Basic signature validation (in production, use proper JWT library)
      if (secret) {
        // For now, we'll do basic validation
        // In production, implement proper HMAC verification
        const expectedSignature = this.generateHMAC(
          parts[0] + "." + parts[1],
          secret
        );
        if (parts[2] !== expectedSignature) {
          return { isValid: false, error: "Invalid token signature" };
        }
      }

      return { isValid: true, payload };
    } catch (error) {
      return { isValid: false, error: `Token parsing error: ${error}` };
    }
  }

  /**
   * Generate HMAC signature for JWT validation
   * Note: This is a simplified implementation. Use a proper JWT library in production.
   */
  private static generateHMAC(data: string, secret: string): string {
    // This is a simplified HMAC implementation
    // In production, use crypto.subtle.importKey and crypto.subtle.sign
    let hash = 0;
    const combined = data + secret;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Log refresh token expiration details
   */
  static logRefreshTokenExpiration(token: string): void {
    try {
      if (!token || typeof token !== "string") {
        console.log("Refresh token is null or not a string");
        return;
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        console.log("Refresh token is not in JWT format");
        return;
      }

      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);

      console.log("🔄 REFRESH TOKEN EXPIRATION CHECK:", {
        exp: payload.exp,
        currentTime,
        timeUntilExpiry: payload.exp - currentTime,
        timeUntilExpiryMinutes: Math.floor((payload.exp - currentTime) / 60),
        isExpired: payload.exp < currentTime,
        tokenPreview: token.substring(0, 20) + "...",
      });
    } catch (error) {
      console.log("Error logging refresh token expiration:", error);
    }
  }

  /**
   * Check if token is expired
   */
  static isTokenExpired(token: string, bufferSeconds: number = 30): boolean {
    try {
      // Check token expiration without logging sensitive data

      // Basic token format validation
      if (!token || typeof token !== "string") {
        // Token is invalid
        return true;
      }

      // Check if it's a JWT token (has 3 parts separated by dots)
      const parts = token.split(".");
      if (parts.length !== 3) {
        // Non-JWT token, assume valid
        return false; // If it's not a JWT, assume it's valid
      }

      // Validate token structure without logging sensitive data

      // Try to parse payload directly first (faster and more lenient)
      let payload: any;
      try {
        payload = JSON.parse(atob(parts[1]));
      } catch (parseError) {
        // If we can't parse, try validation
        const validation = this.validateJWT(token);
        if (!validation.isValid || !validation.payload) {
          // Token validation failed - but don't assume expired, assume invalid format
          // Only mark as expired if we can't parse at all
          console.warn("Token validation failed, but not marking as expired:", validation.error);
          return false; // Don't clear auth on validation errors, let the server decide
        }
        payload = validation.payload;
      }

      if (!payload || typeof payload !== "object") {
        // Invalid payload structure
        return false; // Don't mark as expired, let server handle it
      }

      if (!payload.exp) {
        // Token has no expiration, assume valid
        return false; // No expiration means never expires
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const isExpired = payload.exp < currentTime + bufferSeconds;

      // Token expiration validated successfully

      return isExpired;
    } catch (error) {
      // Error parsing token, consider expired
      return true; // If we can't parse it, consider it expired
    }
  }

  /**
   * Validate form data
   */
  static validateFormData(
    data: Record<string, any>,
    rules: Record<string, any>
  ): {
    isValid: boolean;
    errors: Record<string, string[]>;
  } {
    const errors: Record<string, string[]> = {};

    Object.keys(rules).forEach((field) => {
      const value = data[field];
      const fieldRules = rules[field];
      const fieldErrors: string[] = [];

      // Required validation
      if (fieldRules.required && (!value || value.toString().trim() === "")) {
        fieldErrors.push(`${field} is required`);
      }

      // Type validation
      if (value && fieldRules.type) {
        if (fieldRules.type === "email" && !this.validateEmail(value)) {
          fieldErrors.push(`${field} must be a valid email address`);
        }
        if (fieldRules.type === "phone" && !this.validatePhone(value)) {
          fieldErrors.push(`${field} must be a valid phone number`);
        }
      }

      // Length validation
      if (
        value &&
        fieldRules.minLength &&
        value.length < fieldRules.minLength
      ) {
        fieldErrors.push(
          `${field} must be at least ${fieldRules.minLength} characters long`
        );
      }
      if (
        value &&
        fieldRules.maxLength &&
        value.length > fieldRules.maxLength
      ) {
        fieldErrors.push(
          `${field} must be no more than ${fieldRules.maxLength} characters long`
        );
      }

      // Pattern validation
      if (value && fieldRules.pattern && !fieldRules.pattern.test(value)) {
        fieldErrors.push(`${field} format is invalid`);
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }
}

// Common validation rules for forms
export const FORM_VALIDATION_RULES = {
  email: {
    required: true,
    type: "email",
    maxLength: 255,
  },
  phone: {
    required: true,
    type: "phone",
    maxLength: 15,
  },
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/,
  },
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/,
  },
  password: {
    required: true,
    minLength: 8,
    maxLength: 255,
  },
};
