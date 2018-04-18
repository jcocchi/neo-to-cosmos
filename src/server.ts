require("dotenv").load();
import Arguments from "./arguments";
import { LoggerInstance } from "winston";
import Logger from "./logger";
import Cosmos from "./cosmos";
import { v1 as Neo4j } from "neo4j-driver";
import Neo from "./providers/neo";
import Cache from "./cache";
import { v4 as Uuid } from "uuid";

const args = Arguments();

// Create Logger
const logger: LoggerInstance = Logger();
logger.info(args);

const cosmos = new Cosmos(logger);
const neo = new Neo(logger);
const cache = new Cache();

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

        index += Number.parseInt(process.env.PAGE_SIZE);
        cache.set(nodeIndexKey, index.toString());
    }
};

// const toDocumentDBVertex = (node: INode) => {  // each interface will map their own nodes before getting here
const toDocumentDBVertex = (node: Neo4j.Node) => {  // each interface will map their own nodes before getting here
    const vertex = {
        id: node.identity.toString(10),
        label: node.labels[0]
    };

    addVertexProperties(vertex, node.properties);
    return vertex;
};

const systemProperties = ["id", "_rid", "_self", "_ts", "_etag"];
const addVertexProperties = (propertyBag: any, properties: any) => {
    for (let key in properties) {
        const propertyValues = properties[key];

        if (systemProperties.indexOf(key.toLowerCase()) > -1)
            key += "_prop";

        propertyBag[key] = [];

        // Sometimes the value is itself an array
        if (Array.isArray(propertyValues)) {
            for (const propertyValue of propertyValues)
            addVertexPropertyValue(propertyBag[key], propertyValue);
        } else {
            addVertexPropertyValue(propertyBag[key], propertyValues);
        }
    }
};

const addVertexPropertyValue = (property: any[], propertyValue: any) => {
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

        index += Number.parseInt(process.env.PAGE_SIZE);
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

    addEdgeProperties(edge, r.properties);
    return edge;
};

const addEdgeProperties = (propertyBag: any, properties: any) => {
    for (let key in properties) {
        const propertyValue = properties[key].toString();

        if (systemProperties.indexOf(key.toLowerCase()) > -1)
            key += "_prop";

        propertyBag[key] = propertyValue;
    }
};

migrateData().then(_ => logger.info(`Migration completed for instance ${args.instance}`))
    .catch(error => {
        logger.error(error);
        process.exit();
    });