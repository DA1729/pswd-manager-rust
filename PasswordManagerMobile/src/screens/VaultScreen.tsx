import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  BackHandler,
  RefreshControl
} from 'react-native';
import {
  Text,
  Title,
  Searchbar,
  FAB,
  IconButton,
  Chip,
  Button,
  Menu,
  Divider
} from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useVault } from '../context/VaultContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NestedCard } from '../components/NestedCard';
import { PasswordEntry } from '../types';

interface VaultScreenProps {
  navigation: any;
}

export const VaultScreen: React.FC<VaultScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [filteredEntries, setFilteredEntries] = useState<PasswordEntry[]>([]);
  
  const { state: vaultState, lockVault, searchEntries } = useVault();
  const { state: authState, logout } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  useEffect(() => {
    const results = searchEntries(searchQuery);
    setFilteredEntries(results);
  }, [searchQuery, vaultState.entries]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleLockVault();
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const handleLockVault = () => {
    Alert.alert(
      'Lock Vault',
      'Are you sure you want to lock your vault?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Lock', 
          onPress: () => {
            lockVault();
            navigation.replace('Unlock');
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'This will lock your vault and log you out. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            lockVault();
            await logout();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        }
      ]
    );
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await Clipboard.setStringAsync(text);
      Alert.alert('Copied', `${field} copied to clipboard`);
    } catch (error) {
      Alert.alert('Error', 'Failed to copy to clipboard');
    }
  };

  const handleEntryPress = (entry: PasswordEntry) => {
    navigation.navigate('EntryDetails', { entry });
  };

  const handleAddEntry = () => {
    navigation.navigate('AddEntry');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderPasswordEntry = ({ item }: { item: PasswordEntry }) => (
    <NestedCard 
      style={styles.entryCard} 
      onPress={() => handleEntryPress(item)}
      contentStyle={styles.entryContent}
    >
      <View style={styles.entryHeader}>
        <View style={styles.entryInfo}>
          <Title style={[styles.siteName, { color: theme.colors.onSurface }]}>{item.site}</Title>
          <Text style={[styles.username, { color: theme.colors.onSurfaceVariant }]}>{item.username}</Text>
        </View>
        <View style={styles.actions}>
          <IconButton
            icon="content-copy"
            size={20}
            iconColor={theme.colors.primary}
            onPress={() => copyToClipboard(item.username, 'Username')}
          />
          <IconButton
            icon="key"
            size={20}
            iconColor={theme.colors.primary}
            onPress={() => copyToClipboard(item.password, 'Password')}
          />
        </View>
      </View>
      <View style={styles.entryFooter}>
        <Chip 
          mode="outlined" 
          compact
          style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
          textStyle={{ color: theme.colors.onSecondaryContainer }}
        >
          Last updated: {new Date(item.updatedAt).toLocaleDateString()}
        </Chip>
      </View>
    </NestedCard>
  );

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: theme.colors.onSurfaceVariant }]}>No passwords saved yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
        Add your first password entry to get started
      </Text>
      <Button
        mode="contained"
        onPress={handleAddEntry}
        style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        textColor={theme.colors.onPrimary}
      >
        Add Password
      </Button>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.primary }]}>Password Vault</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {authState.currentUser?.username}
          </Text>
        </View>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <IconButton
              icon="dots-vertical"
              onPress={() => setMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('PasswordGenerator');
            }}
            title="Password Generator"
            leadingIcon="auto-fix"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              toggleTheme();
            }}
            title={isDarkMode ? "Light Mode" : "Dark Mode"}
            leadingIcon={isDarkMode ? "white-balance-sunny" : "moon-waning-crescent"}
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              navigation.navigate('Debug');
            }}
            title="Debug Tools"
            leadingIcon="bug"
          />
          <Divider />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleLockVault();
            }}
            title="Lock Vault"
            leadingIcon="lock"
          />
          <Menu.Item
            onPress={() => {
              setMenuVisible(false);
              handleLogout();
            }}
            title="Logout"
            leadingIcon="logout"
          />
        </Menu>
      </View>

      <Searchbar
        placeholder="Search passwords..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
        inputStyle={{ color: theme.colors.onSurface }}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        iconColor={theme.colors.onSurfaceVariant}
        icon="magnify"
        clearIcon="close"
      />

      <View style={styles.statsContainer}>
        <Chip 
          icon="database" 
          mode="outlined"
          style={{ backgroundColor: theme.colors.primaryContainer }}
          textStyle={{ color: theme.colors.onPrimaryContainer }}
        >
          {vaultState.entries.length} passwords
        </Chip>
        {searchQuery && (
          <Chip 
            icon="magnify" 
            mode="outlined"
            style={{ backgroundColor: theme.colors.tertiaryContainer }}
            textStyle={{ color: theme.colors.onTertiaryContainer }}
          >
            {filteredEntries.length} results
          </Chip>
        )}
      </View>

      <FlatList
        data={filteredEntries}
        renderItem={renderPasswordEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          filteredEntries.length === 0 && styles.emptyListContainer
        ]}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={handleAddEntry}
        label="Add Password"
        color={theme.colors.onPrimary}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    elevation: 2,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'serif',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'serif',
  },
  searchbar: {
    margin: 16,
    elevation: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  entryCard: {
    marginBottom: 16,
  },
  entryContent: {
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  entryInfo: {
    flex: 1,
  },
  siteName: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'serif',
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    fontFamily: 'serif',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
  },
  entryFooter: {
    marginTop: 8,
  },
  chip: {
    alignSelf: 'flex-start',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'serif',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'serif',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});