import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Button,
  Switch,
  TextInput,
  Paragraph,
  Divider,
  Chip
} from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { CryptoUtils } from '../utils/crypto';

interface PasswordGeneratorScreenProps {
  navigation: any;
}

export const PasswordGeneratorScreen: React.FC<PasswordGeneratorScreenProps> = ({ navigation }) => {
  const [length, setLength] = useState('16');
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [entropy, setEntropy] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const validateSettings = (): string | null => {
    const lengthNum = parseInt(length);
    if (isNaN(lengthNum) || lengthNum < 4 || lengthNum > 128) {
      return 'Password length must be between 4 and 128 characters';
    }

    if (!includeSymbols && !includeNumbers && !includeUppercase && !includeLowercase) {
      return 'At least one character type must be selected';
    }

    return null;
  };

  const generatePassword = () => {
    const validationError = validateSettings();
    if (validationError) {
      Alert.alert('Invalid Settings', validationError);
      return;
    }

    setIsGenerating(true);
    
    try {
      const lengthNum = parseInt(length);
      const result = CryptoUtils.generateSecurePassword(
        lengthNum,
        includeSymbols,
        includeNumbers,
        includeUppercase,
        includeLowercase
      );

      setGeneratedPassword(result.password);
      setEntropy(result.entropy);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate password');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedPassword) return;
    
    try {
      await Clipboard.setStringAsync(generatedPassword);
      Alert.alert('Copied', 'Password copied to clipboard');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy password');
    }
  };

  const getStrengthColor = (entropy: number): string => {
    if (entropy < 30) return '#f44336'; // Red - Weak
    if (entropy < 50) return '#ff9800'; // Orange - Fair
    if (entropy < 70) return '#2196f3'; // Blue - Good
    return '#4caf50'; // Green - Strong
  };

  const getStrengthText = (entropy: number): string => {
    if (entropy < 30) return 'Weak';
    if (entropy < 50) return 'Fair';
    if (entropy < 70) return 'Good';
    return 'Strong';
  };

  const estimatedCrackTime = (entropy: number): string => {
    // Assuming 1 billion guesses per second
    const guessesPerSecond = 1e9;
    const totalCombinations = Math.pow(2, entropy);
    const averageTime = totalCombinations / (2 * guessesPerSecond);
    
    if (averageTime < 60) return 'Less than a minute';
    if (averageTime < 3600) return `${Math.round(averageTime / 60)} minutes`;
    if (averageTime < 86400) return `${Math.round(averageTime / 3600)} hours`;
    if (averageTime < 31536000) return `${Math.round(averageTime / 86400)} days`;
    if (averageTime < 31536000000) return `${Math.round(averageTime / 31536000)} years`;
    return 'Billions of years';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>🎲 Password Generator</Title>
          <Paragraph style={styles.subtitle}>
            Generate cryptographically secure passwords
          </Paragraph>

          <Divider style={styles.divider} />

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <TextInput
              label="Password Length"
              value={length}
              onChangeText={setLength}
              mode="outlined"
              keyboardType="numeric"
              style={styles.lengthInput}
              right={<TextInput.Affix text="characters" />}
            />

            <View style={styles.optionRow}>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Symbols</Text>
                <Text style={styles.optionSubtitle}>!@#$%^&*()_+-=[]{}|;:,.&lt;&gt;?</Text>
              </View>
              <Switch
                value={includeSymbols}
                onValueChange={setIncludeSymbols}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Numbers</Text>
                <Text style={styles.optionSubtitle}>0123456789</Text>
              </View>
              <Switch
                value={includeNumbers}
                onValueChange={setIncludeNumbers}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Uppercase Letters</Text>
                <Text style={styles.optionSubtitle}>ABCDEFGHIJKLMNOPQRSTUVWXYZ</Text>
              </View>
              <Switch
                value={includeUppercase}
                onValueChange={setIncludeUppercase}
              />
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Lowercase Letters</Text>
                <Text style={styles.optionSubtitle}>abcdefghijklmnopqrstuvwxyz</Text>
              </View>
              <Switch
                value={includeLowercase}
                onValueChange={setIncludeLowercase}
              />
            </View>
          </View>

          <Button
            mode="contained"
            onPress={generatePassword}
            style={styles.generateButton}
            icon="auto-fix"
            loading={isGenerating}
            disabled={isGenerating}
          >
            Generate Password
          </Button>
        </Card.Content>
      </Card>

      {generatedPassword && (
        <Card style={styles.resultCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Generated Password</Text>
            
            <View style={styles.passwordContainer}>
              <Text style={styles.password} selectable>
                {generatedPassword}
              </Text>
            </View>

            <View style={styles.statsContainer}>
              <Chip 
                mode="flat" 
                style={[
                  styles.strengthChip,
                  { backgroundColor: getStrengthColor(entropy) + '20' }
                ]}
                textStyle={{ color: getStrengthColor(entropy) }}
              >
                {getStrengthText(entropy)}
              </Chip>
              <Chip mode="outlined">
                {entropy.toFixed(1)} bits entropy
              </Chip>
              <Chip mode="outlined">
                {generatedPassword.length} characters
              </Chip>
            </View>

            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Security Analysis</Text>
              <Text style={styles.securityText}>
                📊 Entropy: {entropy.toFixed(2)} bits
              </Text>
              <Text style={styles.securityText}>
                ⏱️ Estimated crack time: {estimatedCrackTime(entropy)}
              </Text>
              <Text style={styles.securityText}>
                🔢 Possible combinations: 2^{entropy.toFixed(0)}
              </Text>
            </View>

            <View style={styles.actionButtons}>
              <Button
                mode="outlined"
                onPress={copyToClipboard}
                style={styles.actionButton}
                icon="content-copy"
              >
                Copy
              </Button>
              <Button
                mode="outlined"
                onPress={generatePassword}
                style={styles.actionButton}
                icon="refresh"
              >
                Generate New
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.tipsCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>💡 Password Tips</Text>
          <Text style={styles.tipText}>
            • Use different passwords for each account
          </Text>
          <Text style={styles.tipText}>
            • Longer passwords are exponentially stronger
          </Text>
          <Text style={styles.tipText}>
            • Include all character types for maximum entropy
          </Text>
          <Text style={styles.tipText}>
            • Never share your passwords with anyone
          </Text>
          <Text style={styles.tipText}>
            • Use a password manager to store them securely
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#1976d2',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  lengthInput: {
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  optionText: {
    flex: 1,
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  generateButton: {
    paddingVertical: 8,
  },
  resultCard: {
    elevation: 4,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  passwordContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  password: {
    fontSize: 16,
    fontFamily: 'monospace',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  strengthChip: {
    borderWidth: 1,
  },
  securityInfo: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1976d2',
  },
  securityText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  tipsCard: {
    elevation: 2,
    backgroundColor: '#fff',
  },
  tipText: {
    fontSize: 14,
    marginBottom: 6,
    color: '#555',
  },
});