require('dotenv').load()
const dse = require('dse-driver')

const client = new dse.Client({
  contactPoints: [process.env.HOST],
  authProvider: new dse.auth.DseGssapiAuthProvider(),
  profiles: [
    new dse.ExecutionProfile('default', {
      graphOptions: { name: process.env.GRAPH_NAME }
    })
  ]})
const pageSize = process.env.PAGE_SIZE

const getNodes = async(index) => {
  // Get total number of verticies
  const result = await client.executeGraph(`g.V().range(${index}, ${pageSize + index}).fold()`)
  const verticies = result.first()

  return verticies
}

const run = async() => {
  let index = 0

  while (true) {
    const nodes = await getNodes(index)
    console.log('Index: ' + index + '     Num Nodes: ' + nodes.length)

    index += nodes.length
    if (nodes.length === 0) {
      break
    }
  }
}

run()
