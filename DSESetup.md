# DSE Setup

## Create a DSE Docker Container
I used [this](https://hub.docker.com/r/luketillman/datastax-enterprise/) docker image and created it by running the following terminal command. If you have a differfent DSE docker image you prefer, you can use that instead.

```terminal
docker run -it --name <DSE CONTAINER NAME> -p 9042:9042 luketillman/datastax-enterprise:5.1.5 -g 
```

### Create a Graph using the Gremlin Console
From a new terminal, open the bash shell of the container you just created above.

```terminal
docker exec -it <DSE CONTAINTER NAME> bash
```

Now that we are inside of the container, open the Gremlin console.

```terminal
dse gremlin-console
```
<img src="https://raw.githubusercontent.com/jcocchi/neo-to-cosmos/master/images/gremlin-console.png">

Now you are ready to create your sample graph. Follow [this](https://docs.datastax.com/en/dse/5.1/dse-dev/datastax_enterprise/graph/using/QuickStartGremlin.html) documentation from DataStax. You can start at step 4 as we have already started the Gremlin console for your DSE instance. At a minimum, follow the tutorial long enough to add some verticies and edges to your graph, but it is not necessary to follow the entire tutorial.

>Hint: Even if you are already familar with Gremlin and know how to create your graph, be sure to still follow steps 4-7 to properly configure your graph environment.

### Create a Graph From Groovy Files
Optionally, if you have groovy files and would rather load them in to your new DSE instance rather than create a graph from scratch with Gremlin, these steps are for you! 

If you don't already have them, create load scripts for each groovy file. Contents should be similar to the following.
```terminal
java -Xmx10g -cp /project/dse-graph-loader-5.1.4-uberjar.jar -Xmx10g com.datastax.dsegraphloader.cli.Executable <GROOVY SCRIPT FILE NAME> -graph <TARGET GRAPH NAME> -address 127.0.0.1 -create_schema true
```
>Verify the `-address` flag is set to `127.0.0.1`  
>Verify the `-cp` flag is set to `/project/dse-graph-loader-5.1.4-uberjar.jar`  
>We will copy the .jar to this location on the docker containter in a following step, so this will be path regardless of where the .jar lives on your local machine.

Copy all of your groovy, csv, and shell script files as well as the the dse-graph-loader-5.1.4-uberjar.jar into a folder we'll call `$PROJECT_HOME`. If you don't already have the DSE Loader jar, you can get it from [here](https://academy.datastax.com/download-drivers).

Open a new terminal and change directories to `$PROJECT_HOME`. From there copy the groovy, csv, load scripts, and loader jar to your docker container in the `/project` folder following the below terminal command.
```terminal
docker cp ./ <DSE CONTAINER NAME>:/project
``` 

Now attach to the running container so you can access it's CLI.
```terminal
docker exec -it <DSE CONTAINER NAME> bash
```

Once inside of the container, run each load script corresponding to your groovy files one by one.
```terminal
cd /project
./loadScript1.sh
...
```

## Now that you have a graph, go back to the [main README](./README.md)

