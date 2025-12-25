import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { ExternalLink, LogOut, HardDrive } from 'lucide-react-native';
import React, { useState, useEffect } from 'react'; // Добавлен useEffect в импорт!
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInspections } from '../context/InspectionContext';

WebBrowser.maybeCompleteAuthSession();

// Настройка discovery для Яндекс OAuth
const discovery = {
  authorizationEndpoint: 'https://oauth.yandex.ru/authorize',
  // Для Implicit Flow tokenEndpoint не требуется
};

export default function AuthScreen() {
  const router = useRouter();
  const { yandexAuth, saveYandexAuth, clearYandexAuth } = useInspections();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Получаем clientId из переменных окружения
  const clientId = process.env.EXPO_PUBLIC_YANDEX_CLIENT_ID;

  // Генерируем redirectUri для Android приложения
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: 'app.rork.carinspectionapp',
    path: 'callback',
  });

  // Создаем запрос авторизации с использованием хука useAuthRequest
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId || '',
      redirectUri,
      scopes: ['login:info', 'cloud_api:disk.info', 'cloud_api:disk.read', 'cloud_api:disk.write'],
      responseType: AuthSession.ResponseType.Token,
      extraParams: {
        force_confirm: 'true', // Для тестирования - всегда показывать окно подтверждения
      },
    },
    discovery
  );

  // === ДОБАВЬТЕ ЭТОТ useEffect ПРЯМО ЗДЕСЬ ===
  // Обработка ответа от Яндекс OAuth
  useEffect(() => {
    console.log('=== Auth Response ===');
    console.log('Response type:', response?.type);
    console.log('Full response:', JSON.stringify(response, null, 2));

    if (!response) return;

    // Обработка успешной авторизации
    if (response.type === 'success') {
      // Безопасное извлечение параметров
      const params = 'params' in response ? response.params : null;
      
      if (params && params.access_token) {
        console.log('Access token received');
        
        const expiresAt = Date.now() + (parseInt(params.expires_in || '31536000', 10) * 1000);
        
        saveYandexAuth({
          accessToken: params.access_token,
          expiresAt,
        }).then(() => {
          console.log('Token saved successfully');
          Alert.alert('Успешно', 'Яндекс Диск подключен');
          router.back();
        }).catch((error) => {
          console.error('Failed to save token:', error);
          Alert.alert('Ошибка', 'Не удалось сохранить токен доступа');
        });
      } else {
        console.error('No access token in response params');
        Alert.alert('Ошибка', 'Не удалось получить токен доступа');
        setIsAuthenticating(false);
      }
    }
    // Обработка ошибки
    else if (response.type === 'error') {
      const error = 'error' in response ? response.error : null;
      console.error('Auth error:', error);
      Alert.alert('Ошибка', `Авторизация не удалась: ${error?.message || 'Неизвестная ошибка'}`);
      setIsAuthenticating(false);
    }
    // Обработка отмены пользователем
    else if (response.type === 'cancel' || response.type === 'dismiss') {
      console.log(`Auth ${response.type} by user`);
      setIsAuthenticating(false);
    }
    // Обработка других состояний
    else if (response.type === 'locked') {
      console.log('Auth browser locked');
      Alert.alert('Ошибка', 'Браузер заблокирован или недоступен');
      setIsAuthenticating(false);
    }
  }, [response, saveYandexAuth, router]);
  // === КОНЕЦ useEffect ===

  // Обработчик нажатия на кнопку подключения
  const handleConnect = async () => {
    if (!clientId) {
      Alert.alert(
        'Ошибка конфигурации',
        'Client ID не настроен. Убедитесь, что вы:\n\n1. Создали приложение "Для авторизации" на https://oauth.yandex.ru/client/new\n2. Указали Android Package Name: app.rork.carinspectionapp\n3. Установили переменную EXPO_PUBLIC_YANDEX_CLIENT_ID',
        [
          { text: 'Открыть регистрацию', onPress: () => Linking.openURL('https://oauth.yandex.ru/client/new') },
          { text: 'Закрыть', style: 'cancel' }
        ]
      );
      return;
    }

    try {
      setIsAuthenticating(true);
      
      // Выводим отладочную информацию
      console.log('=== Yandex Auth Debug ===');
      console.log('Client ID:', clientId);
      console.log('Client ID length:', clientId?.length);
      console.log('Redirect URI:', redirectUri);
      console.log('Request ready:', !!request);
      
      // Проверяем, может ли система открыть нашу схему
      const canOpen = await Linking.canOpenURL(redirectUri);
      console.log('Can open our scheme:', canOpen);

      if (!request) {
        Alert.alert('Ошибка', 'Запрос авторизации ещё не готов');
        setIsAuthenticating(false);
        return;
      }

      // Запускаем процесс авторизации
      const result = await promptAsync();
      console.log('Prompt result:', result);
      
      // Если promptAsync завершился сразу (не ждем ответа через useEffect)
      if (result.type === 'dismiss' || result.type === 'cancel') {
        setIsAuthenticating(false);
      }
      
    } catch (error: any) {
      console.error('Auth initiation error:', error);
      console.error('Error stack:', error.stack);
      Alert.alert('Ошибка', `Не удалось начать авторизацию: ${error.message || 'Неизвестная ошибка'}`);
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
              onPress={() => Linking.openURL('https://disk.yandex.ru/')}
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
              disabled={isAuthenticating || !request}
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