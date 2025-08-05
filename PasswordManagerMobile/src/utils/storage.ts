import * as SecureStore from 'expo-secure-store';
import { PasswordEntry, User } from '../types';
import { CryptoUtils } from './crypto';

export class SecureStorage {
  private static USERS_KEY = 'password_manager_users';
  private static VAULT_PREFIX = 'password_manager_vault_';
  private static CURRENT_USER_KEY = 'password_manager_current_user';

  static async storeUsers(users: User[]): Promise<void> {
    try {
      const usersJson = JSON.stringify(users);
      await SecureStore.setItemAsync(this.USERS_KEY, usersJson);
    } catch (error) {
      throw new Error('Failed to store users data');
    }
  }

  static async getUsers(): Promise<User[]> {
    try {
      const usersJson = await SecureStore.getItemAsync(this.USERS_KEY);
      if (!usersJson) return [];
      return JSON.parse(usersJson);
    } catch (error) {
      return [];
    }
  }

  static async storeCurrentUser(user: User): Promise<void> {
    try {
      const userJson = JSON.stringify(user);
      await SecureStore.setItemAsync(this.CURRENT_USER_KEY, userJson);
    } catch (error) {
      throw new Error('Failed to store current user');
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const userJson = await SecureStore.getItemAsync(this.CURRENT_USER_KEY);
      if (!userJson) return null;
      return JSON.parse(userJson);
    } catch (error) {
      return null;
    }
  }

  static async clearCurrentUser(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.CURRENT_USER_KEY);
    } catch (error) {
      // Ignore errors when clearing
    }
  }

  static async storeEncryptedVault(
    username: string,
    entries: PasswordEntry[],
    masterPassword: string
  ): Promise<void> {
    try {
      console.log('SecureStorage: Starting vault encryption for user:', username);
      console.log('SecureStorage: Number of entries to encrypt:', entries.length);
      
      const vaultData = {
        entries,
        lastModified: new Date().toISOString(),
        version: '1.0'
      };
      
      console.log('SecureStorage: Serializing vault data');
      const serialized = JSON.stringify(vaultData);
      console.log('SecureStorage: Serialized data length:', serialized.length);
      
      console.log('SecureStorage: Starting encryption');
      const encrypted = await CryptoUtils.encryptData(serialized, masterPassword);
      console.log('SecureStorage: Encryption completed, encrypted length:', encrypted.length);
      
      const vaultKey = this.VAULT_PREFIX + username;
      console.log('SecureStorage: Storing encrypted data with key:', vaultKey);
      
      await SecureStore.setItemAsync(vaultKey, encrypted);
      console.log('SecureStorage: Vault stored successfully');
    } catch (error) {
      console.error('SecureStorage: Error storing encrypted vault:', error);
      throw new Error(`Failed to store encrypted vault: ${error.message}`);
    }
  }

  static async getEncryptedVault(
    username: string,
    masterPassword: string
  ): Promise<PasswordEntry[]> {
    try {
      const vaultKey = this.VAULT_PREFIX + username;
      const encrypted = await SecureStore.getItemAsync(vaultKey);
      
      if (!encrypted) {
        return [];
      }

      const decrypted = await CryptoUtils.decryptData(encrypted, masterPassword);
      const vaultData = JSON.parse(decrypted);
      
      return vaultData.entries || [];
    } catch (error) {
      if (error.message.includes('Decryption failed')) {
        throw new Error('Invalid master password');
      }
      throw new Error('Failed to retrieve vault data');
    }
  }

  static async vaultExists(username: string): Promise<boolean> {
    try {
      const vaultKey = this.VAULT_PREFIX + username;
      const vault = await SecureStore.getItemAsync(vaultKey);
      return vault !== null;
    } catch (error) {
      return false;
    }
  }

  static async deleteVault(username: string): Promise<void> {
    try {
      const vaultKey = this.VAULT_PREFIX + username;
      await SecureStore.deleteItemAsync(vaultKey);
    } catch (error) {
      throw new Error('Failed to delete vault');
    }
  }

  static async clearAllData(): Promise<void> {
    try {
      // Get all users first
      const users = await this.getUsers();
      
      // Clear current user
      await this.clearCurrentUser();
      
      // Clear users data
      await SecureStore.deleteItemAsync(this.USERS_KEY);
      
      // Clear all vaults
      for (const user of users) {
        await this.deleteVault(user.username);
      }
    } catch (error) {
      throw new Error('Failed to clear all data');
    }
  }

  static generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}