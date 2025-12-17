import type { FastifyBaseLogger, FastifyServerOptions } from 'fastify';
import type { IlcReportingPlugin } from 'ilc-plugins-sdk';

export class Application {
    static getConfig(reportPlugin: IlcReportingPlugin): FastifyServerOptions {
        return {
            trustProxy: false, // TODO: should be configurable via Registry,
            disableRequestLogging: true,
            genReqId: reportPlugin.genReqId,
            requestIdLogLabel: reportPlugin.requestIdLogLabel,
            loggerInstance: this.createLoggerInstance(reportPlugin.logger),
        };
    }

    private static createLoggerInstance(logger: IlcReportingPlugin['logger']): FastifyBaseLogger {
        const compatibleLogger: FastifyBaseLogger = {
            fatal: logger.fatal.bind(logger),
            error: logger.error.bind(logger),
            warn: logger.warn.bind(logger),
            info: logger.info.bind(logger),
            trace: logger.trace.bind(logger),
            debug: logger.debug.bind(logger),
            level: 'info',
            silent: () => {},
            child: () => compatibleLogger,
        };
        return compatibleLogger;
    }
}
