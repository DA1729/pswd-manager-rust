import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert
} from 'react-native';
import {
  Text,
  Button,
  Card,
  Title,
  Divider
} from 'react-native-paper';
import { useVault } from '../context/VaultContext';
import { useAuth } from '../context/AuthContext';
import { SecureStorage } from '../utils/storage';
import { CryptoUtils } from '../utils/crypto';

export const DebugScreen: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<string>('');
  const { state: vaultState, addEntry } = useVault();
  const { state: authState } = useAuth();

  const runCryptoTest = async () => {
    try {
      setDebugInfo('Starting crypto test...\n');
      
      const testData = 'Hello, World!';
      const testPassword = 'testPassword123';
      
      console.log('Debug: Testing encryption...');
      const encrypted = await CryptoUtils.encryptData(testData, testPassword);
      setDebugInfo(prev => prev + `Encryption successful. Length: ${encrypted.length}\n`);
      
      console.log('Debug: Testing decryption...');
      const decrypted = await CryptoUtils.decryptData(encrypted, testPassword);
      setDebugInfo(prev => prev + `Decryption successful. Data: ${decrypted}\n`);
      
      if (decrypted === testData) {
        setDebugInfo(prev => prev + 'Crypto test PASSED\n');
      } else {
        setDebugInfo(prev => prev + 'Crypto test FAILED - data mismatch\n');
      }
    } catch (error) {
      setDebugInfo(prev => prev + `Crypto test FAILED: ${error.message}\n`);
      console.error('Debug: Crypto test error:', error);
    }
  };

  const runStorageTest = async () => {
    try {
      setDebugInfo(prev => prev + 'Starting storage test...\n');
      
      if (!authState.currentUser) {
        setDebugInfo(prev => prev + 'ERROR: No user logged in\n');
        return;
      }

      const testEntries = [
        {
          id: 'test1',
          site: 'test.com',
          username: 'testuser',
          password: 'testpass123',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      console.log('Debug: Testing vault storage...');
      await SecureStorage.storeEncryptedVault(
        authState.currentUser.username,
        testEntries,
        vaultState.masterPassword || 'testmaster'
      );
      setDebugInfo(prev => prev + 'Storage write successful\n');

      console.log('Debug: Testing vault retrieval...');
      const retrieved = await SecureStorage.getEncryptedVault(
        authState.currentUser.username,
        vaultState.masterPassword || 'testmaster'
      );
      setDebugInfo(prev => prev + `Storage read successful. Entries: ${retrieved.length}\n`);
      
      if (retrieved.length === 1 && retrieved[0].password === 'testpass123') {
        setDebugInfo(prev => prev + 'Storage test PASSED\n');
      } else {
        setDebugInfo(prev => prev + `Storage test FAILED - entries: ${JSON.stringify(retrieved)}\n`);
      }
    } catch (error) {
      setDebugInfo(prev => prev + `Storage test FAILED: ${error.message}\n`);
      console.error('Debug: Storage test error:', error);
    }
  };

  const runFullTest = async () => {
    try {
      setDebugInfo('Starting full add entry test...\n');
      
      const testEntry = {
        site: 'debug.test.com',
        username: 'debuguser',
        password: 'debugpass123'
      };

      console.log('Debug: Testing full addEntry flow...');
      await addEntry(testEntry);
      setDebugInfo(prev => prev + 'Add entry completed\n');
      
      // Check if entry was added to state
      const foundEntry = vaultState.entries.find(e => e.site === testEntry.site);
      if (foundEntry) {
        setDebugInfo(prev => prev + `Entry found in state: ${foundEntry.site}\n`);
        setDebugInfo(prev => prev + `Password saved: ${foundEntry.password === testEntry.password ? 'YES' : 'NO'}\n`);
        setDebugInfo(prev => prev + 'Full test PASSED\n');
      } else {
        setDebugInfo(prev => prev + 'Full test FAILED - entry not found in state\n');
      }
    } catch (error) {
      setDebugInfo(prev => prev + `Full test FAILED: ${error.message}\n`);
      console.error('Debug: Full test error:', error);
    }
  };

  const clearDebugInfo = () => {
    setDebugInfo('');
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Debug Information</Title>
          <Text style={styles.info}>
            User: {authState.currentUser?.username || 'Not logged in'}
          </Text>
          <Text style={styles.info}>
            Vault Locked: {vaultState.isLocked ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.info}>
            Entries Count: {vaultState.entries.length}
          </Text>
          <Text style={styles.info}>
            Has Master Password: {vaultState.masterPassword ? 'Yes' : 'No'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Title>Test Functions</Title>
          
          <Button
            mode="outlined"
            onPress={runCryptoTest}
            style={styles.button}
          >
            Test Crypto Functions
          </Button>
          
          <Button
            mode="outlined"
            onPress={runStorageTest}
            style={styles.button}
          >
            Test Storage Functions
          </Button>
          
          <Button
            mode="outlined"
            onPress={runFullTest}
            style={styles.button}
          >
            Test Full Add Entry
          </Button>
          
          <Button
            mode="outlined"
            onPress={clearDebugInfo}
            style={styles.button}
          >
            Clear Debug Info
          </Button>
        </Card.Content>
      </Card>

      {debugInfo && (
        <Card style={styles.card}>
          <Card.Content>
            <Title>Debug Output</Title>
            <Divider style={styles.divider} />
            <Text style={styles.debugText}>{debugInfo}</Text>
          </Card.Content>
        </Card>
      )}
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
    marginBottom: 16,
    elevation: 4,
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
  },
  button: {
    marginBottom: 12,
  },
  divider: {
    marginVertical: 12,
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 12,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 4,
  },
});