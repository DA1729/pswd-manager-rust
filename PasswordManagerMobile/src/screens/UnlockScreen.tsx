import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  BackHandler
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  ActivityIndicator
} from 'react-native-paper';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { SecureStorage } from '../utils/storage';

interface UnlockScreenProps {
  navigation: any;
}

export const UnlockScreen: React.FC<UnlockScreenProps> = ({ navigation }) => {
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [attempts, setAttempts] = useState(0);
  
  const { state: authState, logout } = useAuth();
  const { unlockVault } = useVault();

  useEffect(() => {
    checkBiometricsAvailability();
    
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleLogout();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const checkBiometricsAvailability = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(hasHardware && isEnrolled);
    } catch (error) {
      setBiometricsAvailable(false);
    }
  };

  const handleUnlock = async () => {
    if (!masterPassword.trim()) {
      Alert.alert('Error', 'Please enter your master password');
      return;
    }

    setIsUnlocking(true);
    
    try {
      await unlockVault(masterPassword);
      setMasterPassword(''); // Clear password from memory
      navigation.replace('Vault');
    } catch (error) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        Alert.alert(
          'Too Many Failed Attempts',
          'For security reasons, you will be logged out.',
          [{ text: 'OK', onPress: handleLogout }]
        );
      } else {
        Alert.alert(
          'Incorrect Password', 
          `Invalid master password. ${3 - newAttempts} attempts remaining.`
        );
      }
      setMasterPassword('');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock your password vault',
        subPrompt: 'Use your biometric to unlock',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        // In a real implementation, you'd retrieve the stored master password
        // For now, we'll just prompt for it
        Alert.alert(
          'Biometric Authentication Successful',
          'Please enter your master password to complete unlock'
        );
      }
    } catch (error) {
      Alert.alert('Biometric Error', 'Failed to authenticate with biometrics');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Master Password',
      'If you forgot your master password, you will need to reset the app and lose all stored passwords. This is by design for security.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset App',
          style: 'destructive',
          onPress: async () => {
            try {
              await SecureStorage.clearAllData();
              await logout();
              Alert.alert('App Reset', 'All data has been cleared. Please register again.');
              navigation.replace('Login');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app data');
            }
          }
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>🔓 Unlock Vault</Title>
            <Paragraph style={styles.subtitle}>
              Welcome back, {authState.currentUser?.username}
            </Paragraph>
            <Paragraph style={styles.description}>
              Enter your master password to access your encrypted vault
            </Paragraph>

            <TextInput
              label="Master Password"
              value={masterPassword}
              onChangeText={setMasterPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
              disabled={isUnlocking}
              onSubmitEditing={handleUnlock}
            />

            <Button
              mode="contained"
              onPress={handleUnlock}
              style={styles.unlockButton}
              disabled={isUnlocking || !masterPassword.trim()}
              loading={isUnlocking}
            >
              {isUnlocking ? 'Unlocking...' : 'Unlock Vault'}
            </Button>

            {biometricsAvailable && (
              <Button
                mode="outlined"
                onPress={handleBiometricAuth}
                style={styles.biometricButton}
                icon="fingerprint"
                disabled={isUnlocking}
              >
                Use Biometric Authentication
              </Button>
            )}

            <View style={styles.buttonRow}>
              <Button
                mode="text"
                onPress={handleForgotPassword}
                style={styles.textButton}
                disabled={isUnlocking}
              >
                Forgot Password?
              </Button>
              <Button
                mode="text"
                onPress={handleLogout}
                style={styles.textButton}
                disabled={isUnlocking}
              >
                Logout
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.securityInfo}>
          <Text style={styles.securityText}>
            🔒 Your vault is protected with AES-256-GCM encryption
          </Text>
          <Text style={styles.securityText}>
            ⚡ Zero-knowledge architecture ensures only you can decrypt your data
          </Text>
          {attempts > 0 && (
            <Text style={styles.warningText}>
              Failed attempts: {attempts}/3
            </Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    fontSize: 14,
  },
  input: {
    marginBottom: 16,
  },
  unlockButton: {
    marginBottom: 12,
    paddingVertical: 8,
  },
  biometricButton: {
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textButton: {
    flex: 1,
  },
  securityInfo: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(25, 118, 210, 0.1)',
    borderRadius: 8,
  },
  securityText: {
    textAlign: 'center',
    color: '#1976d2',
    fontSize: 12,
    marginBottom: 4,
  },
  warningText: {
    textAlign: 'center',
    color: '#f44336',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
});