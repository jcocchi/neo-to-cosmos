require('dotenv').load()
import { Client, ExecutionProfile, auth } from 'dse-driver'

export default class DSE {
  private readonly config: any;
  private readonly pageSize: number; 
  private client: any;

  constructor(config: any) {
    this.config = config
    this.pageSize = Number.parseInt(process.env.PAGE_SIZE) || 500

    // TODO: investigate where this should be created, once in the constructor or each time a query is executed
    this.client = new Client({
      contactPoints: [process.env.DSE_HOST],
      authProvider: new auth.DseGssapiAuthProvider(),
      profiles: [
        new ExecutionProfile('default', {
          graphOptions: { name: process.env.DSE_GRAPH }
        })
    ]})
  }

  getNodes = async(index: number) => {
    const result = await this.client.executeGraph(`g.V().range(${index}, ${this.pageSize + index}).fold()`)
    const verticies = result.first()

    return verticies
  }

  getRelationships = async(index: number) => {
    const result = await this.client.executeGraph(`g.E().range(${index}, ${this.pageSize + index}).fold()`)
    const edges = result.first()
    
    return edges
  }
}
