import React, { createContext, useContext, useReducer } from 'react';
import { VaultState, PasswordEntry } from '../types';
import { SecureStorage } from '../utils/storage';
import { useAuth } from './AuthContext';

interface VaultContextType {
  state: VaultState;
  unlockVault: (masterPassword: string) => Promise<void>;
  lockVault: () => void;
  addEntry: (entry: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEntry: (id: string, entry: Partial<PasswordEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  searchEntries: (query: string) => PasswordEntry[];
  changeMasterPassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

type VaultAction =
  | { type: 'UNLOCK_VAULT'; payload: { entries: PasswordEntry[]; masterPassword: string } }
  | { type: 'LOCK_VAULT' }
  | { type: 'SET_ENTRIES'; payload: PasswordEntry[] }
  | { type: 'ADD_ENTRY'; payload: PasswordEntry }
  | { type: 'UPDATE_ENTRY'; payload: { id: string; updates: Partial<PasswordEntry> } }
  | { type: 'DELETE_ENTRY'; payload: string };

const vaultReducer = (state: VaultState, action: VaultAction): VaultState => {
  switch (action.type) {
    case 'UNLOCK_VAULT':
      return {
        ...state,
        entries: action.payload.entries,
        isLocked: false,
        masterPassword: action.payload.masterPassword
      };
    case 'LOCK_VAULT':
      return {
        entries: [],
        isLocked: true,
        masterPassword: null
      };
    case 'SET_ENTRIES':
      return {
        ...state,
        entries: action.payload
      };
    case 'ADD_ENTRY':
      console.log('VaultReducer: Adding entry with ID:', action.payload.id);
      console.log('VaultReducer: Current entries count:', state.entries.length);
      const newState = {
        ...state,
        entries: [...state.entries, action.payload]
      };
      console.log('VaultReducer: New entries count:', newState.entries.length);
      return newState;
    case 'UPDATE_ENTRY':
      return {
        ...state,
        entries: state.entries.map(entry =>
          entry.id === action.payload.id
            ? { ...entry, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : entry
        )
      };
    case 'DELETE_ENTRY':
      return {
        ...state,
        entries: state.entries.filter(entry => entry.id !== action.payload)
      };
    default:
      return state;
  }
};

const initialState: VaultState = {
  entries: [],
  isLocked: true,
  masterPassword: null
};

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(vaultReducer, initialState);
  const { state: authState } = useAuth();

  const saveVault = async () => {
    try {
      console.log('VaultContext: Starting saveVault');
      
      if (!authState.currentUser) {
        console.error('VaultContext: No user logged in');
        throw new Error('No user logged in');
      }
      
      if (!state.masterPassword) {
        console.error('VaultContext: Vault is locked');
        throw new Error('Vault is locked');
      }

      console.log('VaultContext: Saving vault for user:', authState.currentUser.username);
      console.log('VaultContext: Number of entries to save:', state.entries.length);

      await SecureStorage.storeEncryptedVault(
        authState.currentUser.username,
        state.entries,
        state.masterPassword
      );
      
      console.log('VaultContext: Vault saved successfully');
    } catch (error) {
      console.error('VaultContext: Error saving vault:', error);
      throw error;
    }
  };

  const unlockVault = async (masterPassword: string) => {
    if (!authState.currentUser) {
      throw new Error('No user logged in');
    }

    try {
      const entries = await SecureStorage.getEncryptedVault(
        authState.currentUser.username,
        masterPassword
      );
      
      dispatch({
        type: 'UNLOCK_VAULT',
        payload: { entries, masterPassword }
      });
    } catch (error) {
      throw error;
    }
  };

  const lockVault = () => {
    dispatch({ type: 'LOCK_VAULT' });
  };

  const addEntry = async (entryData: Omit<PasswordEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('VaultContext: Starting addEntry with data:', {
        site: entryData.site,
        username: entryData.username,
        passwordLength: entryData.password?.length || 0
      });

      const now = new Date().toISOString();
      const newEntry: PasswordEntry = {
        ...entryData,
        id: SecureStorage.generateUniqueId(),
        createdAt: now,
        updatedAt: now
      };

      console.log('VaultContext: Created new entry with ID:', newEntry.id);

      dispatch({ type: 'ADD_ENTRY', payload: newEntry });
      console.log('VaultContext: Dispatch completed, calling saveVault');
      
      await saveVault();
      console.log('VaultContext: Entry saved successfully');
    } catch (error) {
      console.error('VaultContext: Error in addEntry:', error);
      throw error;
    }
  };

  const updateEntry = async (id: string, updates: Partial<PasswordEntry>) => {
    dispatch({ type: 'UPDATE_ENTRY', payload: { id, updates } });
    await saveVault();
  };

  const deleteEntry = async (id: string) => {
    dispatch({ type: 'DELETE_ENTRY', payload: id });
    await saveVault();
  };

  const searchEntries = (query: string): PasswordEntry[] => {
    if (!query.trim()) return state.entries;
    
    const lowercaseQuery = query.toLowerCase();
    return state.entries.filter(entry =>
      entry.site.toLowerCase().includes(lowercaseQuery) ||
      entry.username.toLowerCase().includes(lowercaseQuery)
    );
  };

  const changeMasterPassword = async (oldPassword: string, newPassword: string) => {
    if (!authState.currentUser || state.masterPassword !== oldPassword) {
      throw new Error('Invalid current master password');
    }

    // Re-encrypt vault with new password
    await SecureStorage.storeEncryptedVault(
      authState.currentUser.username,
      state.entries,
      newPassword
    );

    // Update context with new password
    dispatch({
      type: 'UNLOCK_VAULT',
      payload: { entries: state.entries, masterPassword: newPassword }
    });
  };

  return (
    <VaultContext.Provider value={{
      state,
      unlockVault,
      lockVault,
      addEntry,
      updateEntry,
      deleteEntry,
      searchEntries,
      changeMasterPassword
    }}>
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (context === undefined) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};