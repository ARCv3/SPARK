import { ILogger } from "discordx";
import { type Logger, pino } from 'pino';

export class DiscordLoggerImpl implements ILogger {

    private readonly _logger : Logger;
    
    constructor(loggerName: string, logLevel: string) {
        this._logger = pino({ level: logLevel })
            .child( { source: loggerName } );
    }

    child(loggerName: string) : Logger {
        return this._logger.child({
            source: loggerName
        });
    }

    error(...args: unknown[]): void {
        this._logger.error(args);
    }

    info(...args: unknown[]): void {
        this._logger.info(args);
    }
    log(...args: unknown[]): void {
        this._logger.debug(args);
    }
    warn(...args: unknown[]): void {
        this._logger.warn(args);
    }

}
