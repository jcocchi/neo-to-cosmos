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

//const nodeIndexKey = `nodeIndex_${args.instance}`;
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
    //console.log('BEFORE \n' + JSON.stringify(node))

    // TODO: investigate how to use node.id.community_id, node.id.member_id, and label
    // DSE id is combo of all three but Cosmos only has one id field
    const id: String = node.label + node.id.community_id + node.id.member_id
    const vertex = {
        id: id,
        label: node.label
    };

    addProperties(vertex, node.properties, false);

    //console.log('AFTER \n' + JSON.stringify(vertex))  
    return vertex;
};

const addProperties = (propertyBag: any, properties: any, isEdge: boolean) => {
    for (const key in properties) {
        // TODO: determine if we need this or not
        // Some Neo4j datasets have "id" as a property in addition to node.id()
        // if (key.toLowerCase() === "id")
        //     continue;

        // Edges have several values in DSE that we can ignore for Cosmos because they are represented a different way
        const keyToLower = key.toLowerCase()
        if (keyToLower === "type" || keyToLower === "inv" || keyToLower === "invlabel" || 
            keyToLower === "outv" || keyToLower === "outvlabel")
            continue;

        const propertyValues = properties[key];
        // Cosmos stores vertex store property values as arrays and edge property values as regular strings
        if (!isEdge) {
            propertyBag[key] = [];   
        }

        // Sometimes the value is itself an array
        if (Array.isArray(propertyValues)) {
            for (const propertyValue of propertyValues) {
                if(isEdge){
                    propertyBag[key] = propertyValue
                    continue;
                }
                addPropertyValue(propertyBag[key], propertyValue);
            }
        } else {
            if(isEdge){
                propertyBag[key] = propertyValues
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

//const relationshipIndexKey = `relationshipIndex_${args.instance}`;
const createEdges = async () => {
    //const indexString = await cache.get(relationshipIndexKey);
    //let index = indexString ? Number.parseInt(indexString) : 0;
    let index: number = 0;
    let relationships: any = [];

    while (true) {
        // logger.info(`Relationship: ${index}`);
        console.log(`Relationship: ${index}`);

        relationships = await dse.getRelationships(index);
        if (relationships.length === 0)
            break;

        const documentEdges = relationships.map((relationship: any) => toDocumentDBEdge(relationship));
        await cosmos.bulkImport(documentEdges);

        index += Number.parseInt(process.env.PAGE_SIZE);
        // cache.set(relationshipIndexKey, index.toString());
    }
};

const toDocumentDBEdge = (relationship: any) => {
    //console.log('BEFORE \n' + JSON.stringify(relationship))

    // outV -> vertex and inV -> sink
    const vertexId: String = relationship.outVLabel + relationship.outV.community_id + relationship.outV.member_id
    const sinkId: String = relationship.inVLabel + relationship.inV.community_id + relationship.inV.member_id    
    const edge = {
        label: relationship.label,
        _isEdge: true,
        _vertexId: vertexId,
        _vertexLabel: relationship.outVLabel,
        _sink: sinkId,
        _sinkLabel: relationship.inVLabel
    };

    addProperties(edge, relationship.properties, true);

    //console.log('AFTER \n' + JSON.stringify(edge))    
    return edge;
};

migrateData().then(_ => console.log(`Migration completed for instance ${args.instance}`))
    .catch(error => {
        console.error(error);
        process.exit();
    });