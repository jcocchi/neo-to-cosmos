import { ArgumentParserOptions, ArgumentParser } from "argparse";

export default () => {
    const argParseOptions: ArgumentParserOptions = { addHelp: true };
    const argsParser = new ArgumentParser(argParseOptions);

    argsParser.addArgument(
        ["-c", "--config"], {
            defaultValue: "../config.json",
            help: "Provide path to config.json file"
        });
    argsParser.addArgument(
        ["-r", "--restart"], {
            nargs: 0,
            help: "Restarts data transfer by deleting Cosmos DB collection and flushing Redis cache"
        });

    return argsParser.parseArgs();
};