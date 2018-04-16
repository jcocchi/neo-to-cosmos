require("dotenv").load();
import Arguments from "./arguments";
import { LoggerInstance } from "winston";
import Logger from "./logger";
import Cosmos from "./cosmos";
import DSE from "./dse";
import Cache from "./cache";
import { v4 as Uuid } from "uuid";

const args = Arguments();

// Create Logger
const logger: LoggerInstance = Logger();
logger.info(args);

const cosmos = new Cosmos(logger);
const dse = new DSE();

const migrateData = async () => {
    logger.info("Beginning data migration");

    await cosmos.initialize();
    await handleRestart();
    await cosmos.createCollectionIfNeeded();

    await createVertices();
    await createEdges();
};

const createVertices = async () => {
    let index: number = 0;
    let vertices: any = [];

    while (true) {
        logger.info(`Vertex: ${index}`);

        vertices = await dse.getVertices(index);
        if (vertices.length === 0)
            break;

        const documentVertices = vertices.map((vertex: any) => toDocumentDBVertex(vertex));
        await cosmos.bulkImport(documentVertices);

        index += Number.parseInt(process.env.PAGE_SIZE);
    }
};

const toDocumentDBVertex = (node: any) => {
    const id: String = node.label + node.id.community_id + node.id.member_id;
    const vertex = {
        id: id,
        label: node.label
    };

    addProperties(vertex, node.properties, false);

    return vertex;
};

const addProperties = (propertyBag: any, properties: any, isEdge: boolean) => {
    for (const key in properties) {
        // Edges have several values in DSE that we can ignore for Cosmos because they are represented a different way
        const keyToLower = key.toLowerCase();
        if (keyToLower === "id" || keyToLower === "type" || keyToLower === "inv" ||
            keyToLower === "invlabel" || keyToLower === "outv" || keyToLower === "outvlabel")
            continue;

        const propertyValues = properties[key];
        // Cosmos stores vertex store property values as arrays and edge property values as regular strings
        if (!isEdge) {
            propertyBag[key] = [];
        }

        // Sometimes the value is itself an array
        if (Array.isArray(propertyValues)) {
            for (const propertyValue of propertyValues) {
                if (isEdge) {
                    propertyBag[key] = propertyValue;
                    continue;
                }
                addPropertyValue(propertyBag[key], propertyValue);
            }
        } else {
            if (isEdge) {
                propertyBag[key] = propertyValues;
                continue;
            }
            addPropertyValue(propertyBag[key], propertyValues);
        }
    }
};

const addPropertyValue = (property: any[], propertyValue: any) => {
    property.push({
        id: Uuid(),
        _value: propertyValue.value
    });
};

const createEdges = async () => {
    let index: number = 0;
    let relationships: any = [];

    while (true) {
        logger.info(`Edge Index: ${index}`);

        relationships = await dse.getEdges(index);
        if (relationships.length === 0)
            break;

        const documentEdges = relationships.map((relationship: any) => toDocumentDBEdge(relationship));
        await cosmos.bulkImport(documentEdges);

        index += Number.parseInt(process.env.PAGE_SIZE);
    }
};

const toDocumentDBEdge = (relationship: any) => {
    // outV -> vertex and inV -> sink
    const vertexId: String = relationship.outVLabel + relationship.outV.community_id + relationship.outV.member_id;
    const sinkId: String = relationship.inVLabel + relationship.inV.community_id + relationship.inV.member_id;
    const edge = {
        label: relationship.label,
        _isEdge: true,
        _vertexId: vertexId,
        _vertexLabel: relationship.outVLabel,
        _sink: sinkId,
        _sinkLabel: relationship.inVLabel
    };

    addProperties(edge, relationship.properties, true);

    return edge;
};

const handleRestart = async () => {
    if (args.restart) {
        await Promise.all([
            cosmos.deleteCollection(),
        ]);
    }
};

migrateData()
    .then(_ => {
        logger.info(`Migration completed for graph ${process.env.DSE_GRAPH}`);
        process.exit();
    })
    .catch(error => {
        logger.error(error);
        process.exit();
    });