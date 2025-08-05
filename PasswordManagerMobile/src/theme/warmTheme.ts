import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

// Warm color palette inspired by portfolio
const warmColors = {
  // Light theme colors
  light: {
    primary: '#d97706', // Warm orange primary
    primaryContainer: '#fed7aa', // Light orange container  
    secondary: '#8b5a3c', // Warm brown secondary
    secondaryContainer: '#f3f0eb', // Light warm container
    tertiary: '#f59e0b', // Amber tertiary
    tertiaryContainer: '#fef3c7', // Light amber container
    surface: '#faf8f5', // Warm off-white surface
    surfaceVariant: '#f3f0eb', // Warm light variant
    background: '#faf8f5', // Warm background
    error: '#dc2626', // Error red
    errorContainer: '#fef2f2', // Light error container
    onPrimary: '#faf8f5', // Text on primary
    onPrimaryContainer: '#2d1810', // Text on primary container
    onSecondary: '#faf8f5', // Text on secondary
    onSecondaryContainer: '#2d1810', // Text on secondary container
    onTertiary: '#1a1611', // Text on tertiary
    onTertiaryContainer: '#2d1810', // Text on tertiary container
    onSurface: '#2d1810', // Text on surface
    onSurfaceVariant: '#8b5a3c', // Text on surface variant
    onBackground: '#2d1810', // Text on background
    onError: '#fef2f2', // Text on error
    onErrorContainer: '#2d1810', // Text on error container
    outline: '#e5d5c8', // Warm outline
    outlineVariant: '#e5d5c8', // Warm outline variant
    inverseSurface: '#2d1810', // Inverse surface
    inverseOnSurface: '#f5f1eb', // Inverse text
    inversePrimary: '#f59e0b', // Inverse primary
    shadow: '#000000', // Shadow
    scrim: '#000000', // Scrim
    backdrop: 'rgba(45, 24, 16, 0.4)', // Warm backdrop
  },
  
  // Dark theme colors
  dark: {
    primary: '#f59e0b', // Brighter orange for dark
    primaryContainer: '#92400e', // Dark orange container
    secondary: '#c4a484', // Light warm brown
    secondaryContainer: '#2d2419', // Dark warm container
    tertiary: '#fbbf24', // Bright amber
    tertiaryContainer: '#451a03', // Dark amber container
    surface: '#1a1611', // Dark warm surface
    surfaceVariant: '#2d2419', // Dark variant
    background: '#1a1611', // Dark warm background
    error: '#ef4444', // Bright error
    errorContainer: '#7f1d1d', // Dark error container
    onPrimary: '#1a1611', // Text on primary
    onPrimaryContainer: '#f5f1eb', // Text on primary container
    onSecondary: '#1a1611', // Text on secondary
    onSecondaryContainer: '#f5f1eb', // Text on secondary container
    onTertiary: '#1a1611', // Text on tertiary
    onTertiaryContainer: '#f5f1eb', // Text on tertiary container
    onSurface: '#f5f1eb', // Text on surface
    onSurfaceVariant: '#c4a484', // Text on surface variant
    onBackground: '#f5f1eb', // Text on background
    onError: '#fef2f2', // Text on error
    onErrorContainer: '#f5f1eb', // Text on error container
    outline: '#3d3426', // Dark outline
    outlineVariant: '#3d3426', // Dark outline variant
    inverseSurface: '#f5f1eb', // Inverse surface
    inverseOnSurface: '#1a1611', // Inverse text
    inversePrimary: '#d97706', // Inverse primary
    shadow: '#000000', // Shadow
    scrim: '#000000', // Scrim
    backdrop: 'rgba(245, 241, 235, 0.4)', // Light backdrop
  },
};

// Create warm light theme
export const warmLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    ...warmColors.light,
  },
  fonts: {
    ...MD3LightTheme.fonts,
    // Use system fonts that approximate serif styling
    displayLarge: {
      ...MD3LightTheme.fonts.displayLarge,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    displayMedium: {
      ...MD3LightTheme.fonts.displayMedium,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    displaySmall: {
      ...MD3LightTheme.fonts.displaySmall,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    headlineLarge: {
      ...MD3LightTheme.fonts.headlineLarge,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    headlineMedium: {
      ...MD3LightTheme.fonts.headlineMedium,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    headlineSmall: {
      ...MD3LightTheme.fonts.headlineSmall,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    titleLarge: {
      ...MD3LightTheme.fonts.titleLarge,
      fontFamily: 'serif',
      fontWeight: '500',
    },
    titleMedium: {
      ...MD3LightTheme.fonts.titleMedium,
      fontFamily: 'serif',
      fontWeight: '500',
    },
    titleSmall: {
      ...MD3LightTheme.fonts.titleSmall,
      fontFamily: 'serif',
      fontWeight: '500',
    },
    bodyLarge: {
      ...MD3LightTheme.fonts.bodyLarge,
      fontFamily: 'serif',
      fontWeight: '400',
    },
    bodyMedium: {
      ...MD3LightTheme.fonts.bodyMedium,
      fontFamily: 'serif',
      fontWeight: '400',
    },
    bodySmall: {
      ...MD3LightTheme.fonts.bodySmall,
      fontFamily: 'serif',
      fontWeight: '400',
    },
  },
};

// Create warm dark theme
export const warmDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    ...warmColors.dark,
  },
  fonts: {
    ...MD3DarkTheme.fonts,
    // Use system fonts that approximate serif styling
    displayLarge: {
      ...MD3DarkTheme.fonts.displayLarge,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    displayMedium: {
      ...MD3DarkTheme.fonts.displayMedium,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    displaySmall: {
      ...MD3DarkTheme.fonts.displaySmall,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    headlineLarge: {
      ...MD3DarkTheme.fonts.headlineLarge,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    headlineMedium: {
      ...MD3DarkTheme.fonts.headlineMedium,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    headlineSmall: {
      ...MD3DarkTheme.fonts.headlineSmall,
      fontFamily: 'serif',
      fontWeight: '600',
    },
    titleLarge: {
      ...MD3DarkTheme.fonts.titleLarge,
      fontFamily: 'serif',
      fontWeight: '500',
    },
    titleMedium: {
      ...MD3DarkTheme.fonts.titleMedium,
      fontFamily: 'serif',
      fontWeight: '500',
    },
    titleSmall: {
      ...MD3DarkTheme.fonts.titleSmall,
      fontFamily: 'serif',
      fontWeight: '500',
    },
    bodyLarge: {
      ...MD3DarkTheme.fonts.bodyLarge,
      fontFamily: 'serif',
      fontWeight: '400',
    },
    bodyMedium: {
      ...MD3DarkTheme.fonts.bodyMedium,
      fontFamily: 'serif',
      fontWeight: '400',
    },
    bodySmall: {
      ...MD3DarkTheme.fonts.bodySmall,
      fontFamily: 'serif',
      fontWeight: '400',
    },
  },
};

export default { warmLightTheme, warmDarkTheme };