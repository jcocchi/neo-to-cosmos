require("dotenv").load();
import { LoggerInstance } from "winston";
import { Client } from "documentdb-typescript";
import { promisifyAll } from "bluebird";
import * as BulkImportSproc from "./bulkImport.js";

export default class Cosmos {
    private readonly logger: LoggerInstance;

    private readonly databaseLink: string;
    private readonly collectionLink: string;

    private readonly client: Client;
    private documentClient: any;

    constructor(logger: LoggerInstance) {
        this.logger = logger;

        this.databaseLink = `dbs/${process.env.COSMOS_DB_NAME}`;
        this.collectionLink = `${this.databaseLink}/colls/${process.env.COSMOS_COLLECTION}`;

        this.client = new Client(process.env.COSMOS_ENDPOINT, process.env.COSMOS_KEY);
        this.client.consistencyLevel = "Eventual";
    }

    initialize = async () => {
        await this.client.openAsync();
        this.documentClient = promisifyAll(this.client.documentClient);
    }

    private createDatabaseIfNeeded = async () => {
        try {
            await this.documentClient.createDatabaseAsync({
                id: process.env.COSMOS_DB_NAME
            });
        } catch (err) {
            this.logger.info(`Database ${process.env.COSMOS_DB_NAME} already exists`);
        }
    }

    createCollectionIfNeeded = async () => {
        await this.createDatabaseIfNeeded();

        try {
            // Lazy indexing boosts the write performance and lowers RU charge of each insert
            // and is ideal for bulk ingestion scenarios for primarily read-heavy collections
            await this.documentClient.createCollectionAsync(this.databaseLink, {
                id: process.env.COSMOS_COLLECTION,
                indexingPolicy: { indexingMode: "lazy" }
            },
                { offerThroughput: process.env.COSMOS_OFFER_THROUGHPUT });
        } catch (err) {
            this.logger.info(`Collection ${process.env.COSMOS_COLLECTION} already exists`);
        }

        await this.createStoredProcedureIfNeeded();
    }

    deleteCollection = async () => {
        try {
            await this.documentClient.deleteCollectionAsync(this.collectionLink);
        } catch (err) {
            this.logger.info(`Collection ${process.env.COSMOS_COLLECTION} does not exist`);
        }
    }

    private createStoredProcedureIfNeeded = async () => {
        try {
            await this.documentClient.createStoredProcedureAsync(this.collectionLink, BulkImportSproc);
        } catch (err) {
            this.logger.info(`Sproc '${BulkImportSproc.id}' already exist`);
        }
    }

    bulkImport = async (docs: any[]) => {
        // This is to avoid unnecessary serialization of document batches in case of level "info"
        if (this.logger.level === "debug")
            this.logger.debug(JSON.stringify(docs));

        const bulkImportSprocLink = `${this.collectionLink}/sprocs/${BulkImportSproc.id}`;
        this.logger.info(`Writing ${docs.length} documents to CosmosDB`);

        // Sprocs don't support array arguments so we have to wrap it in an object
        await this.documentClient.executeStoredProcedureAsync(bulkImportSprocLink, { docs });
    }
}