import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { UnlockScreen } from '../screens/UnlockScreen';
import { VaultScreen } from '../screens/VaultScreen';
import { AddEntryScreen } from '../screens/AddEntryScreen';
import { PasswordGeneratorScreen } from '../screens/PasswordGeneratorScreen';
import { DebugScreen } from '../screens/DebugScreen';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const { state: authState } = useAuth();
  const { state: vaultState } = useVault();

  // Show loading screen while checking auth status
  if (authState.isLoading) {
    return null; // You could add a loading screen here
  }

  // User is not logged in
  if (!authState.isLoggedIn || !authState.currentUser) {
    return (
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1976d2',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              title: 'Sign In',
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{
              title: 'Create Account',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // User is logged in but vault is locked
  if (vaultState.isLocked) {
    return (
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Unlock"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1976d2',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Unlock"
            component={UnlockScreen}
            options={{
              title: 'Unlock Vault',
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  // User is logged in and vault is unlocked
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Vault"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1976d2',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Vault"
          component={VaultScreen}
          options={{
            title: 'Password Vault',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AddEntry"
          component={AddEntryScreen}
          options={{
            title: 'Add Password',
            headerBackTitle: 'Cancel',
          }}
        />
        <Stack.Screen
          name="PasswordGenerator"
          component={PasswordGeneratorScreen}
          options={{
            title: 'Password Generator',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen
          name="Debug"
          component={DebugScreen}
          options={{
            title: 'Debug Tools',
            headerBackTitle: 'Back',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};