import { ConsoleLogger, Injectable } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class LoggerService extends ConsoleLogger {
  private readonly isProduction = process.env.ENVIRONMENT === 'Production';
  declare protected context?: string;

  private readonly logFile = this.isProduction
    ? '/var/log/nestjs-app.log'
    : './nestjs-dev.log';

  setContext(context: string) {
    this.context = context;
  }

  private writeToFile(log: string) {
    fs.appendFileSync(this.logFile, log + '\n');
  }

  private formatLog(
    level: string,
    message: unknown,
    optionalParams?: any[],
  ): string {
    const safeMessage =
      typeof message === 'string' ? message : JSON.stringify(message);
    const extra = optionalParams?.length
      ? optionalParams
          .map((param) =>
            typeof param === 'string' ? param : JSON.stringify(param),
          )
          .join(' ')
      : '';

    if (this.isProduction) {
      return JSON.stringify({
        timestamp: new Date().toISOString(),
        level,
        message: safeMessage,
        context: this.context,
        params: optionalParams,
      });
    } else {
      return `${safeMessage} ${extra}`;
    }
  }

  log(message: any, ...optionalParams: any[]) {
    const log = this.formatLog('log', message, optionalParams);
    this.writeToFile(log);
    super.log(log);
  }

  error(message: any, ...optionalParams: any[]) {
    const log = this.formatLog('error', message, optionalParams);
    this.writeToFile(log);
    super.error(log);
  }

  warn(message: any, ...optionalParams: any[]) {
    const log = this.formatLog('warn', message, optionalParams);
    this.writeToFile(log);
    super.warn(log);
  }

  debug(message: any, ...optionalParams: any[]) {
    const log = this.formatLog('debug', message, optionalParams);
    this.writeToFile(log);
    super.debug(log);
  }

  verbose(message: any, ...optionalParams: any[]) {
    const log = this.formatLog('verbose', message, optionalParams);
    this.writeToFile(log);
    super.verbose(log);
  }
}
