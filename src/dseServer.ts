import Arguments from "./arguments";
import { LoggerInstance } from "winston";
import Logger from "./logger";
import Cosmos from "./cosmos";
import DSE from "./dse";
import Cache from "./cache";
import { v4 as Uuid } from "uuid";

const args = Arguments();

// Set config defaults
const config = require(args.config);
config.logLevel = config.logLevel || "info";
config.pageSize = config.pageSize || 100;

// Create Logger
// const logger: LoggerInstance = Logger(config);
// logger.info(args);

const cosmos = new Cosmos(config, null);
const dse = new DSE(config);
const cache = new Cache(config);

const migrateData = async () => {
    console.log('migrating data.....')

    await cosmos.initialize();
    // await handleRestart();
    await cosmos.createCollectionIfNeeded();

    await createVertexes();
    // await createEdges();
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
    // const indexString = await cache.get(nodeIndexKey);
    // let index = indexString ? Number.parseInt(indexString) : 0;
    let index: number = 0;
    // TODO: get type of DSE Node like Neo4j.Node[]
    let nodes: any = [];

    while (true) {
        console.log(`Node: ${index}`);

        nodes = await dse.getNodes(index);
        if (nodes.length === 0)
            break;

        const documentVertices = nodes.map((node: any) => toDocumentDBVertex(node));
        await cosmos.bulkImport(documentVertices);

        index += Number.parseInt(process.env.PAGE_SIZE);
        // cache.set(nodeIndexKey, index.toString());
    }
};

const toDocumentDBVertex = (node: any) => {
    console.log('BEFORE \n' + JSON.stringify(node))

    // TODO: investigate how to use node.id.community_id, node.id.member_id, and label
    // DSE id is combo of all three but Cosmos only has one id field
    const id: String = node.label + node.id.community_id + node.id.member_id
    const vertex = {
        id: id,
        label: node.label
    };

    addProperties(vertex, node.properties);

    console.log('AFTER \n' + JSON.stringify(vertex))  
    return vertex;
};

const addProperties = (propertyBag: any, properties: any) => {
    for (const key in properties) {
        // TODO: determine if we need this or not
        // Some Neo4j datasets have "id" as a property in addition to node.id()
        // if (key.toLowerCase() === "id")
        //     continue;

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
        _value: propertyValue.value
    });
};

// const relationshipIndexKey = `relationshipIndex_${args.instance}`;
// const createEdges = async () => {
//     const indexString = await cache.get(relationshipIndexKey);
//     let index = indexString ? Number.parseInt(indexString) : 0;
//     let relationships = [];

//     while (true) {
//         logger.info(`Relationship: ${index}`);

//         relationships = await neo.getRelationships(index);
//         if (relationships.length === 0)
//             break;

//         const documentEdges = relationships.map((relationship: any) => toDocumentDBEdge(relationship));
//         await cosmos.bulkImport(documentEdges);

//         index += config.pageSize;
//         cache.set(relationshipIndexKey, index.toString());
//     }
// };

// const toDocumentDBEdge = (relationship: any) => {
//     const r: Neo4j.Relationship = relationship.r;

//     const edge = {
//         label: r.type,
//         _isEdge: true,
//         _vertexId: r.start.toString(10),
//         _vertexLabel: relationship.a,
//         _sink: r.end.toString(10),
//         _sinkLabel: relationship.b
//     };

//     addProperties(edge, r.properties);
//     return edge;
// };

migrateData().then(_ => console.log(`Migration completed for instance ${args.instance}`))
    .catch(error => {
        console.error(error);
        process.exit();
    });