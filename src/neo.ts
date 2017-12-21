require("dotenv").load();
import { LoggerInstance } from "winston";
import { v1 as Neo4j } from "neo4j-driver";

export default class Neo {
    private readonly logger: LoggerInstance;

    constructor(logger: LoggerInstance) {
        this.logger = logger;
    }

    getNodes = async (index: number) => {
        const nodeQuery = `MATCH (n) RETURN n ORDER BY ID(n) SKIP ${index} LIMIT ${process.env.PAGE_SIZE}`;
        return await this.executeCypher(nodeQuery,
            records => records.map(record => record.get("n")));
    }

    getRelationships = async (index: number) => {
        const relationshipQuery = `MATCH (a)-[r]->(b) RETURN labels(a), r, labels(b) ORDER BY ID(r) SKIP ${index} LIMIT ${process.env.PAGE_SIZE}`;
        return await this.executeCypher(relationshipQuery,
            records => records.map(record => {
                return {
                    a: record.get("labels(a)")[0],
                    r: record.get("r"),
                    b: record.get("labels(b)")[0]
                };
            }));
    }

    private executeCypher = async (query: string, getResult: (records: Neo4j.Record[]) => any) => {
        this.logger.debug(query);

        const driver = await Neo4j.driver(process.env.NEO4J_BOLT,
            Neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASS));

        const session = driver.session();
        const records = (await session.run(query)).records;

        session.close();
        driver.close();

        return getResult(records);
    }
}