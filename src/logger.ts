require("dotenv").load();
import * as Winston from "winston";
import * as fs from "fs";
import * as path from "path";

export default () => {
    const logFile: string = process.env.LOG_PATH_FROM_PROJ_ROOT;
    const logDir: string = path.dirname(logFile);

    // Create log file directory if it doesn't already exist
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
    }

    const logger = new (Winston.Logger)({
        level: process.env.LOG_LEVEL,
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
                filename: logFile
            })
        ]
    });

    return logger;
};