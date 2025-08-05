import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

export class CryptoUtils {
  private static SALT_LENGTH = 32;
  private static KEY_LENGTH = 32;
  private static IV_LENGTH = 12;
  private static TAG_LENGTH = 16;

  static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    try {
      console.log('CryptoUtils: Starting key derivation');
      
      // Check if Web Crypto API is available
      if (!crypto || !crypto.subtle) {
        throw new Error('Web Crypto API not available on this platform');
      }
      
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      console.log('CryptoUtils: Password buffer created, length:', passwordBuffer.length);
      
      console.log('CryptoUtils: Importing raw key for PBKDF2');
      const importedKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveBits']
      );
      console.log('CryptoUtils: Raw key imported successfully');

      console.log('CryptoUtils: Starting PBKDF2 key derivation');
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 600000, // Argon2id equivalent iterations
          hash: 'SHA-256'
        },
        importedKey,
        256
      );
      console.log('CryptoUtils: PBKDF2 derivation completed, bits length:', derivedBits.byteLength);

      console.log('CryptoUtils: Importing derived key for AES-GCM');
      const finalKey = await crypto.subtle.importKey(
        'raw',
        derivedBits,
        'AES-GCM',
        false,
        ['encrypt', 'decrypt']
      );
      console.log('CryptoUtils: Final AES-GCM key imported successfully');
      
      return finalKey;
    } catch (error) {
      console.error('CryptoUtils: Key derivation error:', error);
      throw error;
    }
  }

  static async encryptData(data: string, password: string): Promise<string> {
    try {
      console.log('CryptoUtils: Starting encryption, data length:', data.length);
      
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      console.log('CryptoUtils: Data buffer length:', dataBuffer.length);
      
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      console.log('CryptoUtils: Generated salt and IV');
      
      console.log('CryptoUtils: Deriving key from password');
      const key = await this.deriveKey(password, salt);
      console.log('CryptoUtils: Key derived successfully');
      
      console.log('CryptoUtils: Starting AES-GCM encryption');
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        dataBuffer
      );
      console.log('CryptoUtils: Encryption completed, encrypted data length:', encryptedData.byteLength);

      // Combine salt + iv + encrypted data
      const combined = new Uint8Array(
        this.SALT_LENGTH + this.IV_LENGTH + encryptedData.byteLength
      );
      combined.set(salt, 0);
      combined.set(iv, this.SALT_LENGTH);
      combined.set(new Uint8Array(encryptedData), this.SALT_LENGTH + this.IV_LENGTH);
      console.log('CryptoUtils: Combined data length:', combined.length);

      // Return base64 encoded result
      console.log('CryptoUtils: Converting to base64');
      
      // Handle potential issues with large arrays in btoa
      let result: string;
      try {
        if (combined.length > 65536) {
          // For large data, process in chunks
          console.log('CryptoUtils: Processing large data in chunks');
          const chunks: string[] = [];
          for (let i = 0; i < combined.length; i += 65536) {
            const chunk = combined.slice(i, i + 65536);
            chunks.push(String.fromCharCode(...chunk));
          }
          result = btoa(chunks.join(''));
        } else {
          result = btoa(String.fromCharCode(...combined));
        }
      } catch (btoaError) {
        console.error('CryptoUtils: btoa error, trying alternative approach:', btoaError);
        // Fallback: manual base64 encoding
        const base64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let fallbackResult = '';
        for (let i = 0; i < combined.length; i += 3) {
          const a = combined[i];
          const b = combined[i + 1] || 0;
          const c = combined[i + 2] || 0;
          const bitmap = (a << 16) | (b << 8) | c;
          fallbackResult += base64chars.charAt((bitmap >> 18) & 63);
          fallbackResult += base64chars.charAt((bitmap >> 12) & 63);
          fallbackResult += i + 1 < combined.length ? base64chars.charAt((bitmap >> 6) & 63) : '=';
          fallbackResult += i + 2 < combined.length ? base64chars.charAt(bitmap & 63) : '=';
        }
        result = fallbackResult;
      }
      
      console.log('CryptoUtils: Base64 encoded result length:', result.length);
      return result;
    } catch (error) {
      console.error('CryptoUtils: Encryption error:', error);
      throw error;
    }
  }

  static async decryptData(encryptedData: string, password: string): Promise<string> {
    try {
      // Decode base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split('')
          .map(char => char.charCodeAt(0))
      );

      // Extract components
      const salt = combined.slice(0, this.SALT_LENGTH);
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const encrypted = combined.slice(this.SALT_LENGTH + this.IV_LENGTH);

      const key = await this.deriveKey(password, salt);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new Error('Decryption failed - invalid password or corrupted data');
    }
  }

  static generateSecurePassword(
    length: number = 16,
    includeSymbols: boolean = true,
    includeNumbers: boolean = true,
    includeUppercase: boolean = true,
    includeLowercase: boolean = true
  ): { password: string; entropy: number } {
    let charset = '';
    let charsetSize = 0;

    if (includeLowercase) {
      charset += 'abcdefghijklmnopqrstuvwxyz';
      charsetSize += 26;
    }
    if (includeUppercase) {
      charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      charsetSize += 26;
    }
    if (includeNumbers) {
      charset += '0123456789';
      charsetSize += 10;
    }
    if (includeSymbols) {
      charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
      charsetSize += 27;
    }

    if (charset === '') {
      throw new Error('At least one character type must be selected');
    }

    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    // Calculate entropy: log2(charset_size ^ length)
    const entropy = length * Math.log2(charsetSize);

    return { password, entropy };
  }

  static async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    return btoa(String.fromCharCode(...hashArray));
  }

  static validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}