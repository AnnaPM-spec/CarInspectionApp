// utils/network.ts - ПРОСТАЯ РАБОЧАЯ ВЕРСИЯ
export const checkConnectionWithAlert = async (): Promise<boolean> => {
  console.log('📶 Проверяем интернет соединение...');
  
  try {
    // Быстрая проверка через fetch с таймаутом
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://connectivitycheck.gstatic.com/generate_204', {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const hasInternet = response.status === 204 || response.ok;
    console.log(`📶 Интернет ${hasInternet ? 'есть' : 'отсутствует'}`);
    return hasInternet;
  } catch (error) {
    console.log('📶 Нет интернет соединения:', error);
    return false;
  }
};