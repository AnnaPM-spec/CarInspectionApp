import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import ErrorHandler, { AppError } from '../utils/errorHandler';

export const useErrorHandler = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<AppError | null>(null);

  // Обработка операции с автоматической обработкой ошибок
  const handleOperation = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: string,
      onSuccess?: (result: T) => void,
      onError?: (error: AppError) => void
    ): Promise<T | null> => {
      setIsLoading(true);
      setLastError(null);

      try {
        const result = await operation();
        
        if (onSuccess) {
          onSuccess(result);
        }
        
        return result;
      } catch (error: any) {
        const appError = ErrorHandler.handleError(error, context);
        setLastError(appError);
        
        if (onError) {
          onError(appError);
        } else {
          // Показываем стандартный Alert
          const { title, message, buttons } = ErrorHandler.getErrorAlertData(appError);
          Alert.alert(title, message, buttons);
        }
        
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Сброс ошибки
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    handleOperation,
    isLoading,
    lastError,
    clearError,
    hasError: lastError !== null,
    errorType: lastError?.type,
  };
};