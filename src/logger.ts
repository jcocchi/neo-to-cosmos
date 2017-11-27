import * as Winston from "winston";

export default (logLevel: any) => {
    const logger = new (Winston.Logger)({
        level: logLevel,
        transports: [
            new (Winston.transports.Console)({
                timestamp: true,
                colorize: true,
                prettyPrint: true,
                json: false
            }),
            new (Winston.transports.File)({
                timestamp: true,
                prettyPrint: true,
                json: false,
                filename: "logs/neo2cosmos.log"
            })
        ]
    });

    return logger;
};