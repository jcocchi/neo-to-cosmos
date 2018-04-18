require("dotenv").load();
const dse = require("dse-driver");
import IVertex from "../interfaces/vertex";

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

  getVertices = async(index: number): Promise<IVertex[]> => {
    const result = await this.client.executeGraph(`g.V().range(${index}, ${this.pageSize + index}).fold()`);
    const verticies = result.first();

    verticies.map((vertex: any) => {
      const id: String = vertex.label + vertex.id.community_id + vertex.id.member_id;
      const v = {
          id: id,
          label: vertex.label,
          properties: vertex.properties
      };

      return v;
    });

    return verticies;
  }

  getEdges = async(index: number) => {
    const result = await this.client.executeGraph(`g.E().range(${index}, ${this.pageSize + index}).fold()`);
    const edges = result.first();

    return edges;
  }
}
