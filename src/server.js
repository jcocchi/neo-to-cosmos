import config from '../config.json'
import * as throttle from 'promise-parallel-throttle'
import Log from 'log'
import Cosmos from './cosmos.js'
import Neo from './neo.js'
import Cache from './cache.js'
import jsesc from 'jsesc'

// Set config defaults
config.logLevel = config.logLevel || 'info'
config.pageSize = config.pageSize || 100
config.threadCount = config.threadCount || 1

const log = new Log(config.logLevel)
log.info(config)

const cosmos = Cosmos(config, log)
const neo = Neo(config)
const cache = Cache(config)

const migrateData = async () => {
    await handleRestart()
    await cosmos.createCollectionIfNeeded()

    await neo.initialize()
    await createVertexes()
    await createEdges()
    await neo.close()
}

const handleRestart = async () => {
    if (process.argv[2] === 'restart') {
        log.info('starting fresh ...')

        await Promise.all([
            cosmos.deleteCollection(),
            cache.flush()
        ])
    }
}

const nodeIndexKey = 'nodeIndex'
const createVertexes = async () => {
    const indexString = await cache.get(nodeIndexKey)
    let index = indexString ? Number.parseInt(indexString) : 0
    let nodes = []

    while (true) {
        log.info('Node: ' + index)

        nodes = await neo.getNodes(index)
        if (nodes.length === 0)
            break

        const promises = nodes.map(node => async () => {
            const cacheKey = node.identity.toString()

            if (await cache.exists(cacheKey)) {
                log.info(`Skipping Node ${cacheKey}`)
            }
            else {
                await cosmos.executeGremlin(toGremlinVertex(node))
                cache.set(cacheKey, '')
            }
        })

        await throttle.all(promises, {
            maxInProgress: config.threadCount, // we get 'Request rate too large' if this value is too big
            failFast: true
        })

        index += config.pageSize
        cache.set(nodeIndexKey, index)
    }
}

const toGremlinVertex = node => {
    let vertex = `g.addV('${node.labels[0]}')`
    vertex += `.property('id', '${node.identity}')`

    for (const key of Object.keys(node.properties)) {
        const propValue = getPropertyValue(node.properties[key])
        vertex += `.property('${key}', '${propValue}')`
    }

    return vertex
}

const getPropertyValue = property => {
    return jsesc(property.toString())
        .replace(/\\/g, '\\\\')
        .replace(/'/g, '\\\'')
        .replace(/`/g, '\`')
        .replace(/"/g, '\"')
}

const relationshipIndexKey = 'relationshipIndex'
const createEdges = async () => {
    const indexString = await cache.get(relationshipIndexKey)
    let index = indexString ? Number.parseInt(indexString) : 0
    let relationships = []

    while (true) {
        log.info('Relationship: ' + index)

        relationships = await neo.getRelationships(index)
        if (relationships.length === 0)
            break

        const promises = relationships.map(relationship => async () => {
            const cacheKey = `${relationship.start}_${relationship.type}_${relationship.end}`

            if (await cache.exists(cacheKey)) {
                log.info(`Skipping Relationship ${cacheKey}`)
            } else {
                await cosmos.executeGremlin(toGremlinEdge(relationship))
                cache.set(cacheKey, '')
            }
        })

        await throttle.all(promises, {
            maxInProgress: config.threadCount, // we get 'Request rate too large' if this value is too big
            failFast: true
        })

        index += config.pageSize
        cache.set(relationshipIndexKey, index)
    }
}

const toGremlinEdge = relationship => {
    let edge = `g.V('${relationship.start}')`
    edge += `.addE('${relationship.type}')`
    for (const key of Object.keys(relationship.properties)) {
        const propValue = getPropertyValue(relationship.properties[key])
        edge += `.property('${key}', '${propValue}')`
    }
    edge += `.to(g.V('${relationship.end}'))`
    return edge
}

migrateData().then(_ => process.exit()).catch(error => {
    log.error(error)
    process.exit()
})