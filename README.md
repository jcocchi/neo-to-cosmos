# dse-to-cosmos

This app takes a DSE Graph database snapshot and copies all contents to an Azure Cosmos DB Graph database.

## Disclaimer
- The app is **NOT intended to run on a live production database**.
- Due to the possibility of bulk import using Stored Procedures, `DocumentDB` APIs were preferred over `Gremlin`. The Document structures for `Vertices` and `Edges` were extracted from [Cosmos DB Emulator](https://docs.microsoft.com/en-us/azure/cosmos-db/local-emulator) after running [this .NET sample](https://github.com/Azure-Samples/azure-cosmos-db-graph-dotnet-getting-started) which populates Graph data. However since Cosmos DB Graph support is currently in Preview, this internal **structure might change any time, potentially breaking our code**.
- This project is **NOT supported by Microsoft** in any way. It is an independent effort, although we would love if you submit PRs to improve it.

## Get Started
If you're on Windows, make sure you've configured Hyper-V, and installed [Docker for Windows](https://docs.docker.com/docker-for-windows/). Also make sure to use Linux containers.

## Get Your Cosmos DB ready
If you don't have Cosmos DB set up yet, head over to this documentation and follow the instructions to [Create a Database Account](
https://docs.microsoft.com/en-us/azure/cosmos-db/create-graph-dotnet).
You don't need to create a graph, because the app will do it for you.

## Configuration
Before you run the app, you'll need to create `config.json` file. The config contains settings to your DSE and Cosmos DB databases, as well as an optional Redis cache to facilitate resume scenario.

### Step 1: Get Your Cosmos DB Endpoint.
<img src="images/azure-cosmos-keys.png"/>

Select the Keys tab of your Cosmos DB account and you'll see the "URI". Copy that value to  `cosmosDb.endpoint`.

### Step 2: Get Your Cosmos DB AuthKey.
Either primary or secondary key can be used as `cosmosDb.authKey`
> Hint: Use the copy button. Its way easier than trying to select it with a mouse!!!

### Step 3 (Optional): Set up a Redis Server
Set up a local or remote Redis server and specify an optional `redis` value in the config. Redis allows us to resume an incomplete data migration without consuming Cosmos DB RUs. The fastest way to set up Redis is to use docker. 
```
docker run --name dse2cosmos-redis -p 6379:6379 -d redis
```

## Run the tool
`npm start` and watch your data being copied. If for some reason you couldn't transfer the data completely, simply rerun the command. For fresh clean start, do `npm start -- -r`.