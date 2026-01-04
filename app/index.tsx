import { useRouter } from 'expo-router';
import { Plus, Car, Clock, ExternalLink, Settings, Upload, CheckCircle2 } from 'lucide-react-native';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInspections } from '../context/InspectionContext';

export default function HomeScreen() {
  const router = useRouter();
  const { inspections, isLoading, yandexAuth } = useInspections();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const showWelcome = !yandexAuth && inspections.length === 0;

  if (showWelcome) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyContainer}>
          <Car size={80} color="#007AFF" strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>Добро пожаловать!</Text>
          <Text style={styles.emptyText}>
            Подключите Яндекс Диск для автоматической загрузки фото и видео после осмотра
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.connectButtonText}>Подключить Яндекс Диск</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={() => router.push('/new-inspection')}
          >
            <Text style={styles.skipButtonText}>Пропустить (демо режим)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activeInspection = inspections.find(i => i.status === 'active');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Осмотры</Text>
          <Text style={styles.headerSubtitle}>
            {inspections.length} {inspections.length === 1 ? 'осмотр' : 'осмотров'}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/auth')}
          >
            <Settings size={24} color="#007AFF" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.newButton,
              activeInspection && styles.newButtonDisabled,
            ]}
            onPress={() => router.push('/new-inspection')}
            disabled={!!activeInspection}
          >
            <Plus size={24} color="#FFF" strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {activeInspection && (
          <TouchableOpacity
            style={styles.activeCard}
            onPress={() => router.push(`/inspection/${activeInspection.id}`)}
          >
            <View style={styles.activeHeader}>
              <View style={styles.activeIndicator} />
              <Text style={styles.activeLabel}>Активный осмотр</Text>
            </View>
            <Text style={styles.activeCarName}>
              {activeInspection.carBrand || activeInspection.carModel}
            </Text>
            <View style={styles.activeDetails}>
              <Text style={styles.activePhotos}>
                {activeInspection.photos.length} фото, {activeInspection.videos.length} видео
              </Text>
              {activeInspection.status === 'uploading' && (
                <View style={styles.activeUploadingBadge}>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.activeUploadingText}>Загрузка...</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {inspections
          .filter(i => i.status !== 'active')
          .map(inspection => (
            <TouchableOpacity
              key={inspection.id}
              style={styles.card}
              onPress={() => router.push(`/inspection/${inspection.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.carName}>
                  {inspection.carBrand || inspection.carModel}
                </Text>
                {inspection.status === 'uploading' && (
          <View style={styles.statusBadgeUploading}>
            <Upload size={14} color="#007AFF" />
            <Text style={styles.statusBadgeTextUploading}>Загрузка...</Text>
          </View>
        )}
        
        {inspection.status === 'completed' && inspection.yandexDiskFolderUrl && (
          <View style={styles.statusBadgeCompleted}>
            <CheckCircle2 size={14} color="#34C759" />
            <Text style={styles.statusBadgeTextCompleted}>Загружено</Text>
          </View>
        )}
      </View>
      
      <View style={styles.cardDetails}>
        <View style={styles.cardDetailItem}>
          <Clock size={14} color="#8E8E93" strokeWidth={2} />
          <Text style={styles.cardDetailText}>
            {new Date(inspection.startTime).toLocaleString('ru-RU', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        <Text style={styles.cardPhotos}>
          {inspection.photos.length} фото, {inspection.videos.length} видео
        </Text>
      </View>
    </TouchableOpacity>
  ))}

        {inspections.filter(i => i.status !== 'active').length === 0 && (
          <View style={styles.emptyList}>
            <Text style={styles.emptyListText}>
              Завершенных осмотров пока нет
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#000',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 17,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  connectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
  },
  connectButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  skipButton: {
    marginTop: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
  },
  skipButtonText: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    color: '#000',
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  settingsButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  newButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  newButtonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
  },
  activeCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  activeLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeCarName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFF',
    marginBottom: 4,
  },
  activePhotos: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  list: {
    flex: 1,
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  carName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#000',
    flex: 1,
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardDetailText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  cardPhotos: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500' as const,
  },
  emptyList: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyListText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  // Добавьте после существующих стилей:
statusBadgeUploading: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F0F8FF',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  gap: 4,
},
statusBadgeTextUploading: {
  fontSize: 12,
  color: '#007AFF',
  fontWeight: '500',
},
statusBadgeCompleted: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F0FFF0',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  gap: 4,
},
statusBadgeTextCompleted: {
  fontSize: 12,
  color: '#34C759',
  fontWeight: '500',
},
activeDetails: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 4,
},
activeUploadingBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 12,
  gap: 4,
},
activeUploadingText: {
  fontSize: 12,
  color: '#FFF',
  fontWeight: '500',
  marginLeft: 4,
},
});
