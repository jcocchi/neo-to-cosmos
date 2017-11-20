# DSE to Cosmos Setup

## Setup DSE Environment From Groovy Files
- Copy all groovy, csv, and shell script files as well as the the dse-graph-loader-5.1.4-uberjar.jar into a folder we'll call `$PROJECT_HOME`

- If you don't already have them, create load scripts for each groovy file. Contents should be similar to the following.
    - Verify the `-address` flag is set to `127.0.0.1`
    - Verify the `-cp` flag is set to `/project/dse-graph-loader-5.1.4-uberjar.jar` 
>Note: We will copy the .jar to this location on the docker containter in a following step, so this will be path regardless of where the .jar lives on your local machine.
```terminal
java -Xmx10g -cp /project/dse-graph-loader-5.1.4-uberjar.jar -Xmx10g com.datastax.dsegraphloader.cli.Executable csvMapper.groovy -graph MyGraphName -address 127.0.0.1 -create_schema true
```

- Spin up DSE Docker container from [here](https://hub.docker.com/r/luketillman/datastax-enterprise/)
```terminal
docker run -it --name dse-graph-name -p 9042:9042 luketillman/datastax-enterprise:5.1.5 -g 
```

### Follow These Steps From Another CLI 
1. Change directories to $PROJECT_HOME
```terminal
cd $PROJECT_HOME
```
2. Get the id of your docker container
```terminal
docker ps
```
3. Copy the groovy, csv, load scripts, and loader jar to your docker container in the `/project` folder
```terminal
docker cp ./ <CONTAINER_ID>:/project
``` 
4. Attach to the running container so you can access it's CLI
```terminal
docker exec -it <CONTAINER_ID> bash
```
5. Once inside the container, run each load script one by one
```terminal
cd /project
./loadScript.sh
```

## Setup This Project
- Clone fork or download this project to your machine
- Install all npm dependencies
```terminal
npm install
```
- Add a `.env` file to match the `.env.sample` file and fill in all of the values
- Build the project 
```terminal
tsc
```
- Run the project from `dseServer.js`

