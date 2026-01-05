// utils/errorHandler.ts

// Типы ошибок приложения
export enum ErrorType {
  NETWORK = 'NETWORK_ERROR',
  AUTH = 'AUTH_ERROR',
  UPLOAD = 'UPLOAD_ERROR',
  STORAGE = 'STORAGE_ERROR',
  CAMERA = 'CAMERA_ERROR',
  UNKNOWN = 'UNKNOWN_ERROR',
}

// Интерфейс ошибки приложения
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  context?: string;
  timestamp: number;
}

// Класс для ошибок приложения (переименуем, чтобы избежать конфликта)
export class ApplicationError extends Error {
  type: ErrorType;
  originalError?: any;
  context?: string;

  constructor(type: ErrorType, message: string, originalError?: any, context?: string) {
    super(message);
    this.name = 'ApplicationError';
    this.type = type;
    this.originalError = originalError;
    this.context = context;
  }
}

// Централизованный обработчик ошибок
class ErrorHandler {
  // Обработка и логирование ошибки
  static handleError(error: any, context?: string): AppError {
    const appError = this.normalizeError(error, context);
    
    // Логирование в консоль
    console.error(`[${appError.type}] ${appError.message}`, {
      context: appError.context,
      originalError: appError.originalError,
      timestamp: new Date(appError.timestamp).toISOString(),
    });
    
    return appError;
  }

  // Преобразование любой ошибки в AppError
  static normalizeError(error: any, context?: string): AppError {
    let type = ErrorType.UNKNOWN;
    let message = 'Произошла непредвиденная ошибка';

    // Определяем тип ошибки
    if (error instanceof ApplicationError) {
      type = error.type;
      message = error.message;
    } else if (error?.message?.includes('network') || error?.message?.includes('Network')) {
      type = ErrorType.NETWORK;
      message = 'Проблема с подключением к интернету';
    } else if (error?.status === 401 || error?.message?.includes('auth') || error?.message?.includes('token')) {
      type = ErrorType.AUTH;
      message = 'Ошибка авторизации';
    } else if (error?.message?.includes('upload') || error?.message?.includes('загрузк')) {
      type = ErrorType.UPLOAD;
      message = 'Ошибка при загрузке файлов';
    } else if (error?.message?.includes('camera') || error?.message?.includes('фото') || error?.message?.includes('видео')) {
      type = ErrorType.CAMERA;
      message = 'Ошибка при работе с камерой';
    } else if (error?.message) {
      message = error.message;
    }

    return {
      type,
      message,
      originalError: error,
      context,
      timestamp: Date.now(),
    };
  }

  // Получение понятного сообщения для пользователя
  static getUserMessage(error: AppError): string {
    switch (error.type) {
      case ErrorType.NETWORK:
        return 'Проверьте подключение к интернету и попробуйте снова';
      case ErrorType.AUTH:
        return 'Необходимо заново авторизоваться в Яндекс.Диск';
      case ErrorType.UPLOAD:
        return 'Не удалось загрузить файлы. Проверьте доступность Яндекс.Диска';
      case ErrorType.CAMERA:
        return 'Не удалось получить доступ к камере. Проверьте разрешения';
      case ErrorType.STORAGE:
        return 'Недостаточно места для сохранения файлов';
      default:
        return 'Произошла непредвиденная ошибка. Попробуйте еще раз';
    }
  }

  // Показ Alert с ошибкой (возвращаем данные для Alert)
  static getErrorAlertData(error: AppError, onRetry?: () => void) {
    const userMessage = this.getUserMessage(error);
    
    const buttons: any[] = [
      { text: 'OK', style: 'cancel' as const }
    ];
    
    if (onRetry && error.type !== ErrorType.AUTH) {
      buttons.unshift({
        text: 'Повторить',
        style: 'default' as const,
        onPress: onRetry,
      });
    }
    
    return {
      title: 'Ошибка',
      message: userMessage,
      buttons
    };
  }

  // Проверка, является ли ошибка критической
  static isCritical(error: AppError): boolean {
    return [ErrorType.AUTH, ErrorType.STORAGE].includes(error.type);
  }
}

export default ErrorHandler;