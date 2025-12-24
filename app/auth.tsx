import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, LogOut, HardDrive } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as Crypto from 'expo-crypto';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInspections } from '../context/InspectionContext';


WebBrowser.maybeCompleteAuthSession();

const YANDEX_CLIENT_ID = process.env.EXPO_PUBLIC_YANDEX_CLIENT_ID;

export default function AuthScreen() {
  const router = useRouter();
  const { yandexAuth, saveYandexAuth, clearYandexAuth } = useInspections();
  const [isAuthenticating, setIsAuthenticating] = useState(false);



  const handleConnect = async () => {
    if (!YANDEX_CLIENT_ID) {
      Alert.alert(
        'Ошибка конфигурации',
        'Client ID не настроен. Убедитесь, что вы:\n\n1. Создали приложение "Для авторизации" на https://oauth.yandex.ru/client/new\n2. Указали iOS App ID: app.rork.6aycdrbhipych60l9qhmv\n3. Указали Android Package Name: app.rork.6aycdrbhipych60l9qhmv\n4. Установили переменную EXPO_PUBLIC_YANDEX_CLIENT_ID',
        [
          { text: 'Открыть регистрацию', onPress: () => Linking.openURL('https://oauth.yandex.ru/client/new') },
          { text: 'Закрыть', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      setIsAuthenticating(true);

      const deviceId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Date.now().toString() + Math.random().toString()
      );

      const redirectUri = `yx${YANDEX_CLIENT_ID}://callback`;
      const authUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${YANDEX_CLIENT_ID}&device_id=${deviceId}&device_name=CarInspectionApp`;

      console.log('=== Yandex Auth Debug (Implicit Flow) ===');
      console.log('Client ID:', YANDEX_CLIENT_ID);
      console.log('Device ID:', deviceId);
      console.log('Redirect URI:', redirectUri);
      console.log('Auth URL:', authUrl);

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      console.log('Auth result:', result);

      if (result.type === 'success' && result.url) {
        const url = result.url;
        const hashParams = url.split('#')[1];
        
        if (hashParams) {
          const params = new URLSearchParams(hashParams);
          const accessToken = params.get('access_token');
          const expiresIn = params.get('expires_in');

          if (accessToken) {
            const expiresAt = Date.now() + (parseInt(expiresIn || '31536000', 10) * 1000);
            
            await saveYandexAuth({
              accessToken,
              expiresAt,
            });

            Alert.alert('Успешно', 'Яндекс Диск подключен');
            router.back();
          } else {
            Alert.alert('Ошибка', 'Не удалось получить токен доступа');
          }
        } else {
          Alert.alert('Ошибка', 'Не удалось получить токен авторизации');
        }
      } else if (result.type === 'cancel') {
        console.log('Auth cancelled by user');
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Ошибка', 'Не удалось выполнить авторизацию');
    } finally {
      setIsAuthenticating(false);
    }
  };



  const handleDisconnect = () => {
    Alert.alert(
      'Отключить Яндекс Диск?',
      'Вы не сможете загружать новые осмотры до повторного подключения',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отключить',
          style: 'destructive',
          onPress: () => {
            clearYandexAuth();
            router.back();
          },
        },
      ]
    );
  };



  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <HardDrive size={80} color="#007AFF" strokeWidth={1.5} />
        </View>

        <Text style={styles.title}>Яндекс Диск</Text>

        {yandexAuth ? (
          <>
            <View style={styles.connectedCard}>
              <View style={styles.statusIndicator} />
              <Text style={styles.connectedText}>Подключено</Text>
            </View>

            <Text style={styles.description}>
              Все фото и видео автоматически загружаются в отдельные папки на
              Яндекс Диске после завершения осмотра
            </Text>

            <TouchableOpacity
              style={styles.instructionButton}
              onPress={() =>
                Linking.openURL('https://disk.yandex.ru/')
              }
            >
              <ExternalLink size={20} color="#007AFF" strokeWidth={2} />
              <Text style={styles.instructionButtonText}>
                Открыть Яндекс Диск
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.description}>
              Подключите Яндекс Диск для автоматической загрузки фото и видео
              после каждого осмотра. Все файлы будут организованы в отдельные
              папки с указанием даты и модели автомобиля.
            </Text>

            <View style={styles.features}>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>📁</Text>
                <Text style={styles.featureText}>
                  Автоматическое создание папок
                </Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>🔗</Text>
                <Text style={styles.featureText}>
                  Публичная ссылка для отправки
                </Text>
              </View>
              <View style={styles.feature}>
                <Text style={styles.featureIcon}>💾</Text>
                <Text style={styles.featureText}>
                  Оригинальное качество файлов
                </Text>
              </View>
            </View>
          </>
        )}
      </View>

      <View style={styles.footer}>
        {yandexAuth ? (
          <TouchableOpacity
            style={styles.disconnectButton}
            onPress={handleDisconnect}
          >
            <LogOut size={20} color="#FF3B30" strokeWidth={2} />
            <Text style={styles.disconnectButtonText}>Отключить</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.connectButton, isAuthenticating && styles.connectButtonDisabled]}
              onPress={handleConnect}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.connectButtonText}>Подключить Яндекс Диск</Text>
              )}
            </TouchableOpacity>
            
            <Text style={styles.instructionText}>
              После нажатия откроется браузер для авторизации в Яндексе
            </Text>
            
            <TouchableOpacity
              style={styles.helpButton}
              onPress={() => Linking.openURL('https://yandex.ru/dev/id/doc/ru/register-client')}
            >
              <ExternalLink size={16} color="#8E8E93" strokeWidth={2} />
              <Text style={styles.helpButtonText}>Как создать приложение</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#000',
    textAlign: 'center',
    marginBottom: 24,
  },
  connectedCard: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  connectedText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  description: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    gap: 16,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 16,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  featureText: {
    fontSize: 17,
    color: '#000',
    flex: 1,
  },
  instructionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  instructionButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#007AFF',
  },
  footer: {
    padding: 20,
    paddingBottom: 8,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  disconnectButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FF3B30',
  },
  instructionText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    gap: 6,
  },
  helpButtonText: {
    fontSize: 15,
    color: '#8E8E93',
  },
});
