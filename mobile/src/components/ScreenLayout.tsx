import type { NavigationProp } from '@react-navigation/native';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/types';
import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';

type Props = {
  navigation: NavigationProp<RootStackParamList>;
  breadcrumb?: string;
  children: React.ReactNode;
};

export function ScreenLayout({ navigation, breadcrumb, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <AppHeader navigation={navigation} breadcrumb={breadcrumb} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View style={styles.padded}>{children}</View>
          <AppFooter navigation={navigation} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  column: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 8 },
  padded: { paddingHorizontal: 16, paddingBottom: 16 },
});
