import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';
import { useTheme } from '../context/ThemeContext';

interface NestedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  elevation?: number;
}

export const NestedCard: React.FC<NestedCardProps> = ({
  children,
  style,
  contentStyle,
  onPress,
  disabled = false,
  elevation = 0,
}) => {
  const { theme } = useTheme();

  const cardStyles = StyleSheet.create({
    container: {
      position: 'relative',
      backgroundColor: theme.colors.surface,
    },
    outerBorder1: {
      position: 'absolute',
      top: -3,
      left: -3,
      right: -3,
      bottom: -3,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.background,
      zIndex: -1,
    },
    outerBorder2: {
      position: 'absolute',
      top: -6,
      left: -6,
      right: -6,
      bottom: -6,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.background,
      zIndex: -2,
    },
    outerBorder3: {
      position: 'absolute',
      top: -9,
      left: -9,
      right: -9,
      bottom: -9,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      backgroundColor: theme.colors.background,
      zIndex: -3,
    },
    innerCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      elevation: elevation,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3,
    },
    content: {
      padding: 0, // Let parent control padding
    },
  });

  const CardComponent = onPress ? PaperCard : View;

  return (
    <View style={[cardStyles.container, style]}>
      {/* Multiple nested border layers */}
      <View style={cardStyles.outerBorder3} />
      <View style={cardStyles.outerBorder2} />
      <View style={cardStyles.outerBorder1} />
      
      {/* Main card */}
      <CardComponent
        style={cardStyles.innerCard}
        onPress={onPress}
        disabled={disabled}
        {...(onPress ? {} : { pointerEvents: 'none' })}
      >
        {onPress ? (
          <PaperCard.Content style={[cardStyles.content, contentStyle]}>
            {children}
          </PaperCard.Content>
        ) : (
          <View style={[cardStyles.content, contentStyle]}>
            {children}
          </View>
        )}
      </CardComponent>
    </View>
  );
};

export default NestedCard;