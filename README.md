# DSE Graph to CosmosDB Migration Tool

This app takes a DSE Graph database snapshot and copies all contents to an Azure Cosmos DB Graph database.

## Get Started
If you're on Windows, make sure you've configured Hyper-V, and installed [Docker for Windows](https://docs.docker.com/docker-for-windows/). Also make sure to use Linux containers.

## Get Your Cosmos DB Ready
If you don't have Cosmos DB set up yet, head over to this documentation and follow the instructions to [Create a Database Account](
https://docs.microsoft.com/en-us/azure/cosmos-db/create-graph-dotnet).
You don't need to create a graph, because the app will do it for you.

## Configuration
Before you run the app, you'll need to create a `.env` file matching the schema of the existing `.env.sample` file. This contains settings to your DSE and Cosmos DB databases.

>Note: Don't have a DSE Graph set up? Follow [these](./DSESetup.md) instructions to set one up with Docker.

```javascript
DSE_HOST=   // IP of your DSE instance
DSE_GRAPH=  // DSE Graph name

COSMOS_KEY=                 // Auth key for Cosmos (step 2 below)
COMSOS_DB_NAME=             // Pick a name for your Cosmos database
COSMOS_ENDPOINT=            // Cosmos endpoint url (step 1 below)
COSMOS_COLLECTION=          // Pick a name for your Cosmos collection
COSMOS_OFFER_THROUGHPUT=    // Cosmos throughput, check here for guidance https://docs.microsoft.com/en-us/azure/cosmos-db/request-units#estimating-throughput-needs

PAGE_SIZE=  // How many documents you will bulk load to Cosmos at a time. Suggested to start at 500 and adjust as needed

LOG_LEVEL=                  // Project only has info level logs currently
LOG_PATH_FROM_PROJ_ROOT=    // Suggested value of logs/dse2cosmos.log, this folder and file will be created for you if it doesn't already exist 
```

### Step 1: Get Your Cosmos DB Endpoint.
Select the Keys tab of your Cosmos DB account and you'll see the "URI". Copy that value to  `COSMOS_ENDPOINT=`.

<img src="images/azure-cosmos-keys.png"/>

### Step 2: Get Your Cosmos DB AuthKey.
Either primary or secondary key can be used as `COSMOS_KEY=`
> Hint: Use the copy button. It's easier than trying to select it with a mouse.

## Run the Tool
Run the below terminal commands and watch your data being copied. If for some reason you couldn't transfer the data completely, simply rerun the command. For fresh clean start, do `npm start -- -r`.

```terminal
npm install
npm start
```

<img src="images/run-project.gif">

## Verify Gremlin Queries Against Cosmos in the Portal
To execute Gremlin queries on your new CosmosDB Graph and visualize traversals, log back in to the Azure Portal and select the "Data Explorer" blade in your CosmosDB Graph instance. 

<img src="images/graph-portal.png">

Enter a Gremlin query in the text box to vizualize your graph and verify it was ported correctly. The queries from the GIF below are based off of the sample graph from step 23 of [this article](https://docs.datastax.com/en/dse/5.1/dse-dev/datastax_enterprise/graph/using/QuickStartGremlin.html).

<img src="images/graph-traversal.gif">

## Disclaimer
- The app is **NOT intended to run on a live production database**.
- Due to the possibility of bulk import using Stored Procedures, `DocumentDB` APIs were preferred over `Gremlin`. The Document structures for `Vertices` and `Edges` were extracted from [Cosmos DB Emulator](https://docs.microsoft.com/en-us/azure/cosmos-db/local-emulator) after running [this .NET sample](https://github.com/Azure-Samples/azure-cosmos-db-graph-dotnet-getting-started) which populates Graph data. However since Cosmos DB Graph support is currently in Preview, this internal **structure might change any time, potentially breaking our code**.
- This project is **NOT supported by Microsoft** in any way. It is an independent effort, although we would love if you submit PRs to improve it.