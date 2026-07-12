/**
 * Centralized Logger Utility
 * Provides consistent logging across the application
 */

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
  error?: Error;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'app') {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: {
        service: this.serviceName,
        ...context,
      },
      error,
    };

    const logMessage = this.formatLog(entry);

    switch (level) {
      case 'ERROR':
        console.error(logMessage);
        if (error) {
          console.error(error.stack);
        }
        break;
      case 'WARN':
        console.warn(logMessage);
        break;
      case 'DEBUG':
        if (process.env.NODE_ENV === 'development') {
          console.debug(logMessage);
        }
        break;
      default:
        console.log(logMessage);
    }
  }

  private formatLog(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${timestamp}] [${entry.level}] [${this.serviceName}] ${entry.message}${contextStr}`;
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log('INFO', message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log('WARN', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    this.log('ERROR', message, context, error);
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log('DEBUG', message, context);
  }
}

// Factory function to create loggers
export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}

// Default logger
export const logger = new Logger('app');

export default logger;
