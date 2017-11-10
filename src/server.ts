import Arguments from "./arguments";
import { LoggerInstance } from "winston";
import Logger from "./logger";
import Cosmos from "./cosmos";
import { v1 as Neo4j } from "neo4j-driver";
import Neo from "./neo";
import Cache from "./cache";
import { v4 as Uuid } from "uuid";

const args = Arguments();

// Set config defaults
const config = require(args.config);
config.logLevel = config.logLevel || "info";
config.pageSize = config.pageSize || 100;

// Create Logger
const logger: LoggerInstance = Logger(config);
logger.info(args);

const cosmos = new Cosmos(config, logger);
const neo = new Neo(config, logger);
const cache = new Cache(config);

const migrateData = async () => {
    await cosmos.initialize();
    await handleRestart();
    await cosmos.createCollectionIfNeeded();

    await createVertexes();
    await createEdges();
};

const handleRestart = async () => {
    if (args.restart) {
        await Promise.all([
            cosmos.deleteCollection(),
            cache.flush()
        ]);
    }
};

const nodeIndexKey = `nodeIndex_${args.instance}`;
const createVertexes = async () => {
    const indexString = await cache.get(nodeIndexKey);
    let index = indexString ? Number.parseInt(indexString) : 0;
    let nodes: Neo4j.Node[] = [];

    while (true) {
        logger.info(`Node: ${index}`);

        nodes = await neo.getNodes(index);
        if (nodes.length === 0)
            break;

        const documentVertices = nodes.map((node: Neo4j.Node) => toDocumentDBVertex(node));
        await cosmos.bulkImport(documentVertices);

        index += config.pageSize;
        cache.set(nodeIndexKey, index.toString());
    }
};

const toDocumentDBVertex = (node: Neo4j.Node) => {
    const vertex = {
        id: node.identity.toString(10),
        label: node.labels[0]
    };

    addProperties(vertex, node.properties);
    return vertex;
};

const addProperties = (propertyBag: any, properties: any) => {
    for (const key in properties) {
        // Some Neo4j datasets have "id" as a property in addition to node.id()
        if (key.toLowerCase() === "id")
            continue;

        const propertyValues = properties[key];
        propertyBag[key] = [];

        // Sometimes the value is itself an array
        if (Array.isArray(propertyValues)) {
            for (const propertyValue of propertyValues)
                addPropertyValue(propertyBag[key], propertyValue);
        } else {
            addPropertyValue(propertyBag[key], propertyValues);
        }
    }
};

const addPropertyValue = (property: any[], propertyValue: any) => {
    property.push({
        id: Uuid(),
        _value: propertyValue.toString()
    });
};

const relationshipIndexKey = `relationshipIndex_${args.instance}`;
const createEdges = async () => {
    const indexString = await cache.get(relationshipIndexKey);
    let index = indexString ? Number.parseInt(indexString) : 0;
    let relationships = [];

    while (true) {
        logger.info(`Relationship: ${index}`);

        relationships = await neo.getRelationships(index);
        if (relationships.length === 0)
            break;

        const documentEdges = relationships.map((relationship: any) => toDocumentDBEdge(relationship));
        await cosmos.bulkImport(documentEdges);

        index += config.pageSize;
        cache.set(relationshipIndexKey, index.toString());
    }
};

const toDocumentDBEdge = (relationship: any) => {
    const r: Neo4j.Relationship = relationship.r;

    const edge = {
        label: r.type,
        _isEdge: true,
        _vertexId: r.start.toString(10),
        _vertexLabel: relationship.a,
        _sink: r.end.toString(10),
        _sinkLabel: relationship.b
    };

    addProperties(edge, r.properties);
    return edge;
};

migrateData().then(_ => logger.info(`Migration completed for instance ${args.instance}`))
    .catch(error => {
        logger.error(error);
        process.exit();
    });