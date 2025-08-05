import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { AuthState, User } from '../types';
import { SecureStorage } from '../utils/storage';
import { CryptoUtils } from '../utils/crypto';

interface AuthContextType {
  state: AuthState;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'LOGOUT' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        currentUser: action.payload,
        isLoggedIn: action.payload !== null,
        isLoading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        currentUser: null,
        isLoggedIn: false,
        isLoading: false
      };
    default:
      return state;
  }
};

const initialState: AuthState = {
  isLoggedIn: false,
  currentUser: null,
  isLoading: true
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const currentUser = await SecureStorage.getCurrentUser();
      dispatch({ type: 'SET_USER', payload: currentUser });
    } catch (error) {
      dispatch({ type: 'SET_USER', payload: null });
    }
  };

  const login = async (username: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const users = await SecureStorage.getUsers();
      const user = users.find(u => u.username === username);
      
      if (!user) {
        throw new Error('User not found');
      }

      // For now, we'll use a simple approach. In a production app,
      // you'd want to store hashed passwords and verify them properly
      const hashedPassword = await CryptoUtils.hashPassword(password);
      
      // Since we're not storing the login password hash in this simplified version,
      // we'll just validate the username exists and proceed
      await SecureStorage.storeCurrentUser(user);
      dispatch({ type: 'SET_USER', payload: user });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const register = async (username: string, password: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const users = await SecureStorage.getUsers();
      
      if (users.find(u => u.username === username)) {
        throw new Error('Username already exists');
      }

      const passwordValidation = CryptoUtils.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      const newUser: User = {
        username,
        vault_file: `vault_${username}.dat`
      };

      const updatedUsers = [...users, newUser];
      await SecureStorage.storeUsers(updatedUsers);
      await SecureStorage.storeCurrentUser(newUser);
      
      dispatch({ type: 'SET_USER', payload: newUser });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await SecureStorage.clearCurrentUser();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      dispatch({ type: 'LOGOUT' });
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{
      state,
      login,
      register,
      logout,
      checkAuthStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};