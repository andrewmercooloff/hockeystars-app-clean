import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LogEntry {
  id: number;
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error';
  message: string;
}

let logEntries: LogEntry[] = [];
let logIdCounter = 0;
const MAX_LOGS = 1000;

// Перехватываем console методы
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;
const originalError = console.error;

const addLog = (level: 'log' | 'info' | 'warn' | 'error', ...args: any[]) => {
  const timestamp = new Date().toLocaleTimeString('ru-RU', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    fractionalSecondDigits: 3
  });
  
  const message = args
    .map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');

  logEntries.push({
    id: logIdCounter++,
    timestamp,
    level,
    message,
  });

  // Ограничиваем количество логов
  if (logEntries.length > MAX_LOGS) {
    logEntries = logEntries.slice(-MAX_LOGS);
  }
};

// Переопределяем console методы
console.log = (...args: any[]) => {
  addLog('log', ...args);
  originalLog(...args);
};

console.info = (...args: any[]) => {
  addLog('info', ...args);
  originalInfo(...args);
};

console.warn = (...args: any[]) => {
  addLog('warn', ...args);
  originalWarn(...args);
};

console.error = (...args: any[]) => {
  addLog('error', ...args);
  originalError(...args);
};

export default function LogViewer() {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isVisible) {
      // Обновляем логи каждые 100мс когда модальное окно открыто
      const interval = setInterval(() => {
        setLogs([...logEntries]);
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isVisible]);

  useEffect(() => {
    if (isVisible && scrollViewRef.current) {
      // Автопрокрутка к последнему логу
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [logs, isVisible]);

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#ff4444';
      case 'warn':
        return '#ffaa00';
      case 'info':
        return '#4488ff';
      default:
        return '#ffffff';
    }
  };

  const clearLogs = () => {
    logEntries = [];
    setLogs([]);
  };

  const exportLogs = () => {
    const logText = logs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`
    ).join('\n');
    
    // В реальном приложении можно использовать expo-sharing для экспорта
    console.log('=== EXPORT LOGS ===');
    console.log(logText);
  };

  // Скрытая кнопка для открытия логов (тройное нажатие в углу экрана)
  return (
    <>
      <TouchableOpacity
        style={styles.openButton}
        onPress={() => setIsVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="bug" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Логи приложения</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={clearLogs}
              >
                <Ionicons name="trash-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={exportLogs}
              >
                <Ionicons name="download-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setIsVisible(false)}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.logsContainer}
            contentContainerStyle={styles.logsContent}
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>Логи пусты</Text>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logEntry}>
                  <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                  <Text
                    style={[
                      styles.logLevel,
                      { color: getLogColor(log.level) },
                    ]}
                  >
                    [{log.level.toUpperCase()}]
                  </Text>
                  <Text style={styles.logMessage}>{log.message}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Всего логов: {logs.length} | Фильтр: Все
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  logsContainer: {
    flex: 1,
  },
  logsContent: {
    padding: 12,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    flexWrap: 'wrap',
  },
  logTimestamp: {
    color: '#888',
    fontSize: 11,
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logLevel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logMessage: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
  },
  footer: {
    padding: 12,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  footerText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
  },
});

