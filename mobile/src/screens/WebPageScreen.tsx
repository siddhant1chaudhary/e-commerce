import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ScreenLayout } from '../components/ScreenLayout';
import { API_BASE_URL } from '../config';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'WebPage'>;

export function WebPageScreen({ navigation, route }: Props) {
  const { path, title } = route.params;
  const uri = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const webHeight = useMemo(() => Math.min(Math.round(Dimensions.get('window').height * 0.65), 720), []);

  return (
    <ScreenLayout navigation={navigation} breadcrumb={`Home / ${title}`}>
      <View style={[styles.webWrap, { height: webHeight }]}>
        <WebView
          style={styles.web}
          source={{ uri }}
          startInLoadingState
          nestedScrollEnabled
          renderLoading={() => <ActivityIndicator style={styles.loader} />}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  webWrap: { width: '100%' },
  web: { flex: 1, backgroundColor: '#fff' },
  loader: { marginTop: 40 },
});
