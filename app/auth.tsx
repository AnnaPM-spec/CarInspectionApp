import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { ExternalLink, LogOut, HardDrive } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
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

// Настройка discovery для Яндекс OAuth
const discovery = {
  authorizationEndpoint: 'https://oauth.yandex.ru/authorize',
};

export default function AuthScreen() {
  const router = useRouter();
  const { yandexAuth, saveYandexAuth, clearYandexAuth } = useInspections();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Функция для добавления логов
  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const log = `${timestamp}: ${message}`;
    console.log(log);
    setDebugLogs(prev => [...prev.slice(-9), log]); // Храним последние 10 логов
  };

  // Получаем clientId из переменных окружения
  const clientId = process.env.EXPO_PUBLIC_YANDEX_CLIENT_ID;

  // Явно указываем redirectUri для Яндекс OAuth
  const redirectUri = 'app.rork.carinspectionapp://callback';

  // Создаем запрос авторизации с использованием хука useAuthRequest
  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: clientId || '',
      redirectUri,
      scopes: ['login:info', 'cloud_api:disk.info', 'cloud_api:disk.read', 'cloud_api:disk.write'],
      responseType: AuthSession.ResponseType.Token,
      extraParams: {
        force_confirm: 'true',
      },
    },
    discovery
  );

  // Обработка ответа от Яндекс OAuth
  useEffect(() => {
    if (!response) return;

    addDebugLog(`Ответ от Яндекса: ${response.type}`);

    if (response.type === 'success') {
      const params = 'params' in response ? response.params : null;
      
      if (params && params.access_token) {
        addDebugLog('Получен access token');
        
        const expiresAt = Date.now() + (parseInt(params.expires_in || '31536000', 10) * 1000);
        
        saveYandexAuth({
          accessToken: params.access_token,
          expiresAt,
        }).then(() => {
          addDebugLog('Токен сохранён успешно');
          Alert.alert('Успешно', 'Яндекс Диск подключен');
          router.back();
        }).catch((error) => {
          addDebugLog(`Ошибка сохранения токена: ${error.message}`);
          Alert.alert('Ошибка', 'Не удалось сохранить токен доступа');
        });
      } else {
        addDebugLog('Нет access token в ответе');
        Alert.alert('Ошибка', 'Не удалось получить токен доступа');
        setIsAuthenticating(false);
      }
    } else if (response.type === 'error') {
      const error = 'error' in response ? response.error : null;
      addDebugLog(`Ошибка авторизации: ${error?.message || 'Неизвестная ошибка'}`);
      Alert.alert('Ошибка', `Авторизация не удалась: ${error?.message || 'Неизвестная ошибка'}`);
      setIsAuthenticating(false);
    } else if (response.type === 'cancel' || response.type === 'dismiss') {
      addDebugLog(`Авторизация ${response.type} пользователем`);
      setIsAuthenticating(false);
    } else if (response.type === 'locked') {
      addDebugLog('Браузер заблокирован');
      Alert.alert('Ошибка', 'Браузер заблокирован или недоступен');
      setIsAuthenticating(false);
    }
  }, [response, saveYandexAuth, router]);

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

    // === ПОШАГОВАЯ ОТЛАДКА С ALERT ===
    
    // Шаг 1: Проверяем clientId
    Alert.alert('Шаг 1/5', `Client ID: ${clientId?.substring(0, 8)}...\nНажмите OK для проверки схемы`);
    
    // Шаг 2: Проверяем схему
    const testSchemes = [
      'app.rork.carinspectionapp://callback',
      'app.rork.carinspectionapp:///callback',
      'app.rork.carinspectionapp://',
    ];
    
    let schemeWorks = false;
    let workingScheme = '';
    
    for (const scheme of testSchemes) {
      const canOpen = await Linking.canOpenURL(scheme);
      console.log(`Схема ${scheme}: ${canOpen ? '✓' : '✗'}`);
      if (canOpen) {
        schemeWorks = true;
        workingScheme = scheme;
        break;
      }
    }
    
    Alert.alert(
      'Шаг 2/5', 
      `Проверка схемы:\n${testSchemes.map(s => `${s}: ${schemeWorks && s === workingScheme ? '✓' : '✗'}`).join('\n')}\n\nРабочая схема: ${workingScheme || 'НЕТ'}\n\nНажмите OK для продолжения`
    );
    
    if (!schemeWorks) {
      Alert.alert(
        'Ошибка схемы', 
        `Ни одна схема не работает!\nПроверьте app.json:\n1. scheme: "app.rork.carinspectionapp"\n2. android.intentFilters\n\nЗатем переустановите приложение.`
      );
      setIsAuthenticating(false);
      return;
    }

    // Шаг 3: Проверяем request
    if (!request) {
      Alert.alert('Ошибка', 'Запрос авторизации ещё не готов');
      setIsAuthenticating(false);
      return;
    }

    Alert.alert('Шаг 3/5', `Запрос готов: ${!!request}\nНажмите OK для открытия авторизации Яндекс`);
    
    // Шаг 4: Создаём тестовый URL для проверки
    const testUrl = `https://oauth.yandex.ru/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(workingScheme || redirectUri)}&force_confirm=true`;
    console.log('Тестовый URL для Яндекс:', testUrl);
    
    Alert.alert(
      'Шаг 4/5', 
      `Параметры запроса:\n- Client ID: ${clientId?.substring(0, 8)}...\n- Redirect: ${workingScheme || redirectUri}\n\nНажмите OK для запуска авторизации`
    );
    
    // Шаг 5: Запускаем авторизацию
    Alert.alert('Шаг 5/5', 'Открывается браузер Яндекс...');
    
    const result = await promptAsync();
    
    Alert.alert(
      'Результат авторизации', 
      `Тип результата: ${result.type}\n${result.type === 'success' ? '✅ Успешно!' : '❌ Ошибка'}`
    );
    
    if (result.type === 'dismiss' || result.type === 'cancel') {
      console.log(`Auth ${result.type} by user`);
      setIsAuthenticating(false);
    }
    
  } catch (error: any) {
    console.error('Auth initiation error:', error);
    Alert.alert(
      'Критическая ошибка', 
      `Не удалось начать авторизацию:\n\n${error.message || 'Неизвестная ошибка'}\n\nStack: ${error.stack?.substring(0, 100)}...`
    );
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

      {/* === БЛОК С ЛОГАМИ ДЛЯ ОТЛАДКИ === */}
      {__DEV__ && debugLogs.length > 0 && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Логи отладки:</Text>
          {debugLogs.slice(-5).map((log, index) => (
            <Text key={index} style={styles.debugText}>{log}</Text>
          ))}
        </View>
      )}
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
  // === НОВЫЕ СТИЛИ ДЛЯ ЛОГОВ ===
  debugContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    margin: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  debugTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
    fontSize: 14,
  },
  debugText: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
  },
});