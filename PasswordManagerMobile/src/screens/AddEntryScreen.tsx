import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Title,
  Switch,
  Divider,
  IconButton
} from 'react-native-paper';
import { useVault } from '../context/VaultContext';
import { CryptoUtils } from '../utils/crypto';

interface AddEntryScreenProps {
  navigation: any;
}

export const AddEntryScreen: React.FC<AddEntryScreenProps> = ({ navigation }) => {
  const [site, setSite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [useGenerator, setUseGenerator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Password generator settings
  const [generatorLength, setGeneratorLength] = useState('16');
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);

  const { addEntry } = useVault();

  const validateInputs = (): string | null => {
    if (!site.trim()) return 'Website/Service name is required';
    if (!username.trim()) return 'Username is required';
    if (!password.trim()) return 'Password is required';
    
    if (site.length > 100) return 'Website name is too long (max 100 characters)';
    if (username.length > 100) return 'Username is too long (max 100 characters)';
    if (password.length > 500) return 'Password is too long (max 500 characters)';
    
    return null;
  };

  const generatePassword = () => {
    try {
      const length = parseInt(generatorLength);
      if (isNaN(length) || length < 8 || length > 128) {
        Alert.alert('Error', 'Password length must be between 8 and 128 characters');
        return;
      }

      if (!includeSymbols && !includeNumbers && !includeUppercase && !includeLowercase) {
        Alert.alert('Error', 'At least one character type must be selected');
        return;
      }

      const result = CryptoUtils.generateSecurePassword(
        length,
        includeSymbols,
        includeNumbers,
        includeUppercase,
        includeLowercase
      );

      setPassword(result.password);
      Alert.alert(
        'Password Generated',
        `Generated secure password with ${result.entropy.toFixed(1)} bits of entropy`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to generate password');
    }
  };

  const handleSave = async () => {
    const validationError = validateInputs();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('AddEntryScreen: Starting save process');
      console.log('AddEntryScreen: Entry data:', {
        site: site.trim(),
        username: username.trim(),
        passwordLength: password.length
      });

      await addEntry({
        site: site.trim(),
        username: username.trim(),
        password: password
      });

      console.log('AddEntryScreen: Entry saved successfully');
      Alert.alert(
        'Success',
        'Password entry saved successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('AddEntryScreen: Error saving entry:', error);
      
      let errorMessage = 'Failed to save password entry';
      if (error instanceof Error) {
        if (error.message.includes('No user logged in')) {
          errorMessage = 'Please log in again to save entries';
        } else if (error.message.includes('Vault is locked')) {
          errorMessage = 'Your vault is locked. Please unlock it first';
        } else if (error.message.includes('encryption') || error.message.includes('crypto')) {
          errorMessage = 'Failed to encrypt password data. Please try again';
        } else if (error.message.includes('SecureStore') || error.message.includes('storage')) {
          errorMessage = 'Failed to save to secure storage. Please check device storage';
        } else {
          errorMessage = `Save failed: ${error.message}`;
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (site || username || password) {
      Alert.alert(
        'Discard Changes',
        'Are you sure you want to discard your changes?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Add New Password</Title>

            <TextInput
              label="Website/Service"
              value={site}
              onChangeText={setSite}
              mode="outlined"
              style={styles.input}
              placeholder="e.g., gmail.com, facebook.com"
              autoCapitalize="none"
              disabled={isLoading}
            />

            <TextInput
              label="Username/Email"
              value={username}
              onChangeText={setUsername}
              mode="outlined"
              style={styles.input}
              placeholder="Your username or email"
              autoCapitalize="none"
              disabled={isLoading}
            />

            <View style={styles.passwordSection}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Use Password Generator</Text>
                <Switch
                  value={useGenerator}
                  onValueChange={setUseGenerator}
                  disabled={isLoading}
                />
              </View>

              {useGenerator && (
                <Card style={styles.generatorCard}>
                  <Card.Content>
                    <Title style={styles.generatorTitle}>Password Generator</Title>
                    
                    <TextInput
                      label="Length"
                      value={generatorLength}
                      onChangeText={setGeneratorLength}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.lengthInput}
                      disabled={isLoading}
                    />

                    <View style={styles.optionRow}>
                      <Text>Include Symbols (!@#$...)</Text>
                      <Switch
                        value={includeSymbols}
                        onValueChange={setIncludeSymbols}
                        disabled={isLoading}
                      />
                    </View>

                    <View style={styles.optionRow}>
                      <Text>Include Numbers (0-9)</Text>
                      <Switch
                        value={includeNumbers}
                        onValueChange={setIncludeNumbers}
                        disabled={isLoading}
                      />
                    </View>

                    <View style={styles.optionRow}>
                      <Text>Include Uppercase (A-Z)</Text>
                      <Switch
                        value={includeUppercase}
                        onValueChange={setIncludeUppercase}
                        disabled={isLoading}
                      />
                    </View>

                    <View style={styles.optionRow}>
                      <Text>Include Lowercase (a-z)</Text>
                      <Switch
                        value={includeLowercase}
                        onValueChange={setIncludeLowercase}
                        disabled={isLoading}
                      />
                    </View>

                    <Button
                      mode="outlined"
                      onPress={generatePassword}
                      style={styles.generateButton}
                      icon="auto-fix"
                      disabled={isLoading}
                    >
                      Generate Password
                    </Button>
                  </Card.Content>
                </Card>
              )}

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
                placeholder="Enter or generate a secure password"
                disabled={isLoading}
                multiline={showPassword}
              />
            </View>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={handleCancel}
            style={styles.cancelButton}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={styles.saveButton}
            loading={isLoading}
            disabled={isLoading}
          >
            Save Entry
          </Button>
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
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    elevation: 4,
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#1976d2',
  },
  input: {
    marginBottom: 16,
  },
  passwordSection: {
    marginTop: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  generatorCard: {
    marginBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  generatorTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  lengthInput: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButton: {
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});