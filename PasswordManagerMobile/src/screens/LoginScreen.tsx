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
  Title,
  Paragraph,
  ActivityIndicator
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NestedCard } from '../components/NestedCard';

interface LoginScreenProps {
  navigation: any;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, state } = useAuth();
  const { theme } = useTheme();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    try {
      await login(username.trim(), password);
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Invalid credentials');
    }
  };

  const navigateToRegister = () => {
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <NestedCard style={styles.card} contentStyle={styles.cardContent}>
            <Title style={[styles.title, { color: theme.colors.primary }]}>🔐 Password Manager</Title>
            <Paragraph style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Secure your passwords with military-grade encryption
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
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              textColor={theme.colors.onSurface}
            />

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
                  iconColor={theme.colors.onSurfaceVariant}
                />
              }
              style={styles.input}
              autoComplete="password"
              disabled={state.isLoading}
              outlineColor={theme.colors.outline}
              activeOutlineColor={theme.colors.primary}
              textColor={theme.colors.onSurface}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              style={[styles.loginButton, { backgroundColor: theme.colors.primary }]}
              disabled={state.isLoading}
              loading={state.isLoading}
              textColor={theme.colors.onPrimary}
            >
              {state.isLoading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Button
              mode="text"
              onPress={navigateToRegister}
              style={styles.registerButton}
              disabled={state.isLoading}
              textColor={theme.colors.primary}
            >
              Don't have an account? Register
            </Button>
          </NestedCard>

          <View style={[styles.securityInfo, { backgroundColor: `${theme.colors.primaryContainer}33` }]}>
            <Text style={[styles.securityText, { color: theme.colors.primary }]}>
              🔒 Your data is encrypted with AES-256-GCM
            </Text>
            <Text style={[styles.securityText, { color: theme.colors.primary }]}>
              🛡️ Zero-knowledge architecture
            </Text>
            <Text style={[styles.securityText, { color: theme.colors.primary }]}>
              🔑 Only you can access your passwords
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
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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
  cardContent: {
    padding: 24,
  },
  title: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    fontSize: 16,
    fontFamily: 'serif',
  },
  input: {
    marginBottom: 16,
    fontFamily: 'serif',
  },
  loginButton: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  registerButton: {
    marginBottom: 8,
  },
  securityInfo: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  securityText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 4,
  },
});