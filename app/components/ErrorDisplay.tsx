// components/ErrorDisplay.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppError } from '../../utils/errorHandler';

interface ErrorDisplayProps {
  error: AppError | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export default function ErrorDisplay({ error, onRetry, onDismiss }: ErrorDisplayProps) {
  if (!error) return null;

  const getErrorColor = () => {
    switch (error.type) {
      case 'NETWORK_ERROR': return '#FF9500';
      case 'AUTH_ERROR': return '#FF3B30';
      case 'UPLOAD_ERROR': return '#5856D6';
      default: return '#8E8E93';
    }
  };

  return (
    <View style={[styles.container, { borderLeftColor: getErrorColor() }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Ошибка: {error.type.replace('_ERROR', '')}</Text>
        <Text style={styles.message}>{error.message}</Text>
        <Text style={styles.context}>{error.context}</Text>
      </View>
      
      <View style={styles.actions}>
        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Text style={styles.dismissText}>Скрыть</Text>
          </TouchableOpacity>
        )}
        
        {onRetry && error.type !== 'AUTH_ERROR' && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Повторить</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  context: {
    fontSize: 12,
    color: '#C7C7CC',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F2F2F7',
  },
  dismissText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  retryText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '500',
  },
});