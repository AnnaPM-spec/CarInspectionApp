import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, LogOut, HardDrive } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInspections } from '../context/InspectionContext';

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  const router = useRouter();
  const { yandexAuth, saveYandexAuth, clearYandexAuth } = useInspections();
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Демо режим',
        'Для демонстрации используется тестовый токен. В реальном приложении здесь будет OAuth авторизация.',
        [
          {
            text: 'ОК',
            onPress: () => {
              saveYandexAuth({
                accessToken: 'demo_token_for_testing',
                expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
              });
              router.back();
            },
          },
        ]
      );
      return;
    }

    try {
      setIsLoading(true);

      Alert.alert(
        'Настройка OAuth',
        'Для работы с Яндекс Диском необходимо:\n\n1. Создать приложение в Яндекс OAuth\n2. Получить Client ID\n3. Настроить Redirect URI\n\nСейчас используется демо-токен для тестирования.',
        [
          {
            text: 'Инструкция',
            onPress: () => {
              Linking.openURL('https://yandex.ru/dev/oauth/');
            },
          },
          {
            text: 'Использовать демо',
            onPress: () => {
              saveYandexAuth({
                accessToken: 'demo_token_for_testing',
                expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
              });
              router.back();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Ошибка', 'Не удалось авторизоваться');
    } finally {
      setIsLoading(false);
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
          <TouchableOpacity
            style={[styles.connectButton, isLoading && styles.connectButtonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.connectButtonText}>Подключить Яндекс Диск</Text>
            )}
          </TouchableOpacity>
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
    paddingBottom: Platform.OS === 'ios' ? 0 : 20,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
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
});
