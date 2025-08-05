export interface PasswordEntry {
  id: string;
  site: string;
  username: string;
  password: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  username: string;
  vault_file: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  currentUser: User | null;
  isLoading: boolean;
}

export interface VaultState {
  entries: PasswordEntry[];
  isLocked: boolean;
  masterPassword: string | null;
}

export interface PasswordGeneratorConfig {
  length: number;
  includeSymbols: boolean;
  includeNumbers: boolean;
  includeUppercase: boolean;
  includeLowercase: boolean;
}