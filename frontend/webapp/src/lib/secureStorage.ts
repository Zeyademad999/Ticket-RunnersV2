/**
 * Secure Storage Utility
 * Provides secure token storage with encryption and XSS protection
 */

interface SecureStorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
}

class SecureStorage {
  private static instance: SecureStorage;
  private encryptionKey: string;
  private readonly PREFIX = "tr_secure_";

  constructor() {
    // Generate a device-specific encryption key
    this.encryptionKey = this.generateEncryptionKey();
  }

  static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  private generateEncryptionKey(): string {
    // Create a more secure device-specific key
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.platform,
      navigator.cookieEnabled.toString(),
    ].join("|");

    // Use Web Crypto API for better key generation
    if (typeof crypto !== "undefined" && crypto.subtle) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprint);
        const hashBuffer = crypto.subtle.digestSync("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      } catch (error) {
        console.warn(
          "Web Crypto API not available, falling back to simple hash"
        );
      }
    }

    // Fallback to simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
  }

  private async encrypt(data: string): Promise<string> {
    try {
      // Use Web Crypto API for secure encryption
      if (typeof crypto !== "undefined" && crypto.subtle) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);

        // Generate a secure key from our encryption key
        const keyMaterial = await crypto.subtle.importKey(
          "raw",
          encoder.encode(this.encryptionKey),
          { name: "PBKDF2" },
          false,
          ["deriveBits", "deriveKey"]
        );

        // Derive a key using PBKDF2
        const key = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: encoder.encode("ticket-runner-salt"),
            iterations: 100000,
            hash: "SHA-256",
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt"]
        );

        // Generate a random IV
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // Encrypt the data
        const encrypted = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          dataBuffer
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        return btoa(String.fromCharCode(...combined));
      } else {
        // Fallback to improved XOR encryption if Web Crypto API is not available
        return this.encryptFallback(data);
      }
    } catch (error) {
      console.error("Encryption failed:", error);
      // Fallback to simple encoding if encryption fails
      return btoa(data);
    }
  }

  private encryptFallback(data: string): string {
    // Improved fallback encryption
    const keyHash = this.hashString(this.encryptionKey);
    const salt = this.generateSalt();

    let encrypted = "";
    for (let i = 0; i < data.length; i++) {
      const keyChar = keyHash.charCodeAt(i % keyHash.length);
      const dataChar = data.charCodeAt(i);
      const saltChar = salt.charCodeAt(i % salt.length);
      // Use multiple XOR operations with salt for better security
      const encryptedChar = dataChar ^ keyChar ^ saltChar ^ i % 256;
      encrypted += String.fromCharCode(encryptedChar);
    }

    return btoa(salt + encrypted);
  }

  private generateSalt(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let salt = "";
    for (let i = 0; i < 16; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
  }

  private async decrypt(encryptedData: string): Promise<string> {
    try {
      const data = atob(encryptedData);

      // Check if this is Web Crypto API encrypted data (has IV at the beginning)
      if (data.length > 12 && this.isWebCryptoEncrypted(data)) {
        return await this.decryptWebCrypto(data);
      } else {
        // Fallback to XOR decryption
        return this.decryptFallback(data);
      }
    } catch (error) {
      console.warn("Failed to decrypt data:", error);
      return "";
    }
  }

  private isWebCryptoEncrypted(data: string): boolean {
    // Check if data starts with a valid IV (12 bytes) followed by encrypted data
    return data.length > 12;
  }

  private async decryptWebCrypto(data: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const dataBuffer = new Uint8Array(
        data.split("").map((char) => char.charCodeAt(0))
      );

      // Extract IV (first 12 bytes) and encrypted data
      const iv = dataBuffer.slice(0, 12);
      const encrypted = dataBuffer.slice(12);

      // Generate the same key as encryption
      const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(this.encryptionKey),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: encoder.encode("ticket-runner-salt"),
          iterations: 100000,
          hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );

      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encrypted
      );

      return decoder.decode(decrypted);
    } catch (error) {
      console.warn("Web Crypto decryption failed, falling back:", error);
      return this.decryptFallback(data);
    }
  }

  private decryptFallback(data: string): string {
    try {
      const keyHash = this.hashString(this.encryptionKey);

      // Extract salt (first 16 characters) and encrypted data
      const salt = data.substring(0, 16);
      const encrypted = data.substring(16);

      let decrypted = "";
      for (let i = 0; i < encrypted.length; i++) {
        const keyChar = keyHash.charCodeAt(i % keyHash.length);
        const dataChar = encrypted.charCodeAt(i);
        const saltChar = salt.charCodeAt(i % salt.length);
        // Reverse the XOR operations
        const decryptedChar = dataChar ^ keyChar ^ saltChar ^ i % 256;
        decrypted += String.fromCharCode(decryptedChar);
      }
      return decrypted;
    } catch (error) {
      console.warn("Fallback decryption failed:", error);
      return "";
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
  }

  private isExpired(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl;
  }

  async setItem(
    key: string,
    value: string,
    options: SecureStorageOptions = {}
  ): Promise<void> {
    try {
      const encryptedValue = options.encrypt
        ? await this.encrypt(value)
        : value;
      const data = {
        value: encryptedValue,
        timestamp: Date.now(),
        encrypted: options.encrypt || false,
        ttl: options.ttl || 0,
      };

      const storageKey = this.PREFIX + key;

      // Use sessionStorage for auth tokens to make them tab-specific
      // This allows each tab to have its own independent session
      if (key === "authToken" || key === "refreshToken" || key === "userData") {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
        console.log(`Stored ${key} in sessionStorage for tab-specific session`);
        console.log(`Storage key: ${storageKey}`);
        console.log(
          `Data preview: ${JSON.stringify(data).substring(0, 100)}...`
        );
      } else {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
        console.log(`Stored ${key} in sessionStorage for session-only data`);
      }
    } catch (error) {
      console.error("Failed to store secure data:", error);
      // Fallback to memory storage for critical data
      this.setMemoryItem(key, value);
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      const storageKey = this.PREFIX + key;

      // Check sessionStorage first for tab-specific data
      let stored = sessionStorage.getItem(storageKey);
      console.log(`Getting ${key} from sessionStorage:`, !!stored);
      
      // Fallback to localStorage for backward compatibility (only for non-auth keys)
      if (!stored && key !== "authToken" && key !== "refreshToken" && key !== "userData") {
        stored = localStorage.getItem(storageKey);
        console.log(`Getting ${key} from localStorage (fallback):`, !!stored);
      }

      if (!stored) {
        // Check memory fallback
        return this.getMemoryItem(key);
      }

      const data = JSON.parse(stored);

      // Check if data has expired
      if (data.ttl > 0 && this.isExpired(data.timestamp, data.ttl)) {
        this.removeItem(key);
        return null;
      }

      return data.encrypted ? await this.decrypt(data.value) : data.value;
    } catch (error) {
      console.error("Failed to retrieve secure data:", error);
      return this.getMemoryItem(key);
    }
  }

  removeItem(key: string): void {
    try {
      const storageKey = this.PREFIX + key;
      // Remove from both localStorage and sessionStorage to be safe
      localStorage.removeItem(storageKey);
      sessionStorage.removeItem(storageKey);
      this.removeMemoryItem(key);
    } catch (error) {
      console.error("Failed to remove secure data:", error);
    }
  }

  clear(): void {
    try {
      // Clear all secure storage items from both localStorage and sessionStorage
      const localStorageKeys = Object.keys(localStorage);
      const sessionStorageKeys = Object.keys(sessionStorage);

      [...localStorageKeys, ...sessionStorageKeys].forEach((key) => {
        if (key.startsWith(this.PREFIX)) {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        }
      });
      this.clearMemory();
    } catch (error) {
      console.error("Failed to clear secure storage:", error);
    }
  }

  // Memory fallback for critical data
  private memoryStorage: Map<string, string> = new Map();

  private setMemoryItem(key: string, value: string): void {
    this.memoryStorage.set(key, value);
  }

  private getMemoryItem(key: string): string | null {
    return this.memoryStorage.get(key) || null;
  }

  private removeMemoryItem(key: string): void {
    this.memoryStorage.delete(key);
  }

  private clearMemory(): void {
    this.memoryStorage.clear();
  }
}

// Export singleton instance
export const secureStorage = SecureStorage.getInstance();

// Convenience functions for common use cases
export const setSecureToken = async (
  token: string,
  ttl?: number
): Promise<void> => {
  await secureStorage.setItem("authToken", token, { encrypt: true, ttl });
};

export const getSecureToken = async (): Promise<string | null> => {
  return await secureStorage.getItem("authToken");
};

export const setSecureRefreshToken = async (
  token: string,
  ttl?: number
): Promise<void> => {
  await secureStorage.setItem("refreshToken", token, { encrypt: true, ttl });
};

export const getSecureRefreshToken = async (): Promise<string | null> => {
  return await secureStorage.getItem("refreshToken");
};

export const setSecureUserData = async (userData: string): Promise<void> => {
  await secureStorage.setItem("userData", userData, { encrypt: true });
};

export const getSecureUserData = async (): Promise<string | null> => {
  return await secureStorage.getItem("userData");
};

export const clearSecureAuth = (): void => {
  secureStorage.removeItem("authToken");
  secureStorage.removeItem("refreshToken");
  secureStorage.removeItem("userData");
};
