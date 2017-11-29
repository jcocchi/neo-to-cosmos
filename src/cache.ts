require('dotenv').load()
import { ClientOpts, createClient } from "redis";
import { promisifyAll } from "bluebird";

export default class Cache {
    private readonly redisClient: any;

    constructor() {
        if (process.env.REDIS !== undefined) {
            const redisOptions: ClientOpts = {
                auth_pass: process.env.REDIS_PASS
            };
            if (process.env.REDIS_SSL) {
                redisOptions.tls = {
                    servername: process.env.REDIS_HOST
                };
            }

            this.redisClient = promisifyAll(createClient(
                Number.parseInt(process.env.REDIS_PORT), process.env.REDIS_HOST, redisOptions));
        }
    }

    exists = async (key: string) => {
        return this.redisClient ? await this.redisClient.existsAsync(key) : false;
    }

    get = async (key: string) => {
        return this.redisClient ? await this.redisClient.getAsync(key) : undefined;
    }

    set = (key: string, value: string) => {
        if (this.redisClient)
            this.redisClient.set(key, value);
    }

    flush = async () => {
        if (this.redisClient)
            await this.redisClient.flushdbAsync();
    }
}