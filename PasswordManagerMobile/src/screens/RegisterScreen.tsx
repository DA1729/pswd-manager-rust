import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Paragraph,
  HelperText
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { CryptoUtils } from '../utils/crypto';

interface RegisterScreenProps {
  navigation: any;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, state } = useAuth();

  const passwordValidation = CryptoUtils.validatePasswordStrength(password);
  const passwordsMatch = password === confirmPassword;

  const handleRegister = async () => {
    if (!username.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return;
    }

    if (!passwordValidation.isValid) {
      Alert.alert('Password Requirements', passwordValidation.errors.join('\n'));
      return;
    }

    if (!passwordsMatch) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      await register(username.trim(), password);
      Alert.alert(
        'Success',
        'Account created successfully! You can now log in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Failed to create account');
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Create Account</Title>
              <Paragraph style={styles.subtitle}>
                Join the secure password management platform
              </Paragraph>

              <TextInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                mode="outlined"
                style={styles.input}
                autoCapitalize="none"
                autoComplete="username"
                disabled={state.isLoading}
              />
              <HelperText type="info" visible={true}>
                Username must be at least 3 characters long
              </HelperText>

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                mode="outlined"
                secureTextEntry={!showPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.input}
                disabled={state.isLoading}
              />
              <HelperText 
                type={passwordValidation.isValid ? 'info' : 'error'} 
                visible={password.length > 0}
              >
                {password.length > 0 && !passwordValidation.isValid 
                  ? passwordValidation.errors[0] 
                  : 'Strong password required'
                }
              </HelperText>

              <TextInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                mode="outlined"
                secureTextEntry={!showConfirmPassword}
                right={
                  <TextInput.Icon
                    icon={showConfirmPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                style={styles.input}
                disabled={state.isLoading}
              />
              <HelperText 
                type={passwordsMatch ? 'info' : 'error'} 
                visible={confirmPassword.length > 0}
              >
                {confirmPassword.length > 0 && !passwordsMatch 
                  ? 'Passwords do not match' 
                  : 'Passwords match'
                }
              </HelperText>

              <Button
                mode="contained"
                onPress={handleRegister}
                style={styles.registerButton}
                disabled={
                  state.isLoading || 
                  !passwordValidation.isValid || 
                  !passwordsMatch ||
                  !username.trim() ||
                  username.length < 3
                }
                loading={state.isLoading}
              >
                {state.isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <Button
                mode="text"
                onPress={navigateToLogin}
                style={styles.loginButton}
                disabled={state.isLoading}
              >
                Already have an account? Sign In
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.requirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <Text style={[
              styles.requirement,
              password.length >= 8 ? styles.requirementMet : styles.requirementUnmet
            ]}>
              • At least 8 characters
            </Text>
            <Text style={[
              styles.requirement,
              /[a-z]/.test(password) ? styles.requirementMet : styles.requirementUnmet
            ]}>
              • Lowercase letter
            </Text>
            <Text style={[
              styles.requirement,
              /[A-Z]/.test(password) ? styles.requirementMet : styles.requirementUnmet
            ]}>
              • Uppercase letter
            </Text>
            <Text style={[
              styles.requirement,
              /\d/.test(password) ? styles.requirementMet : styles.requirementUnmet
            ]}>
              • Number
            </Text>
            <Text style={[
              styles.requirement,
              /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) 
                ? styles.requirementMet 
                : styles.requirementUnmet
            ]}>
              • Special character
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
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
    marginBottom: 24,
    color: '#666',
    fontSize: 16,
  },
  input: {
    marginBottom: 4,
  },
  registerButton: {
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 8,
  },
  loginButton: {
    marginBottom: 8,
  },
  requirements: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#388e3c',
  },
  requirement: {
    fontSize: 14,
    marginBottom: 4,
  },
  requirementMet: {
    color: '#4caf50',
  },
  requirementUnmet: {
    color: '#757575',
  },
});