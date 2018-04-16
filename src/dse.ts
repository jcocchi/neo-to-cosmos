require("dotenv").load();
// TODO: fix this for typescript style
const dse = require("dse-driver");

export default class DSE {
  private readonly pageSize: number;
  private client: any;

  constructor() {
    this.pageSize = Number.parseInt(process.env.PAGE_SIZE) || 500;

    this.client = new dse.Client({
      contactPoints: [process.env.DSE_HOST],
      authProvider: new dse.auth.DseGssapiAuthProvider(),
      profiles: [
        new dse.ExecutionProfile("default", {
          graphOptions: { name: process.env.DSE_GRAPH }
        })
    ]});
  }

  getVertices = async(index: number) => {
    const result = await this.client.executeGraph(`g.V().range(${index}, ${this.pageSize + index}).fold()`);
    const verticies = result.first();

    return verticies;
  }

  getEdges = async(index: number) => {
    const result = await this.client.executeGraph(`g.E().range(${index}, ${this.pageSize + index}).fold()`);
    const edges = result.first();

    return edges;
  }
}
