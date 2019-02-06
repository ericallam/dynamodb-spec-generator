const fs = require("fs");
const md5 = require("md5");
const _ = require("lodash");
const { Command, flags } = require("@oclif/command");
const { renderMarkdown } = require("./render");
const { promisify } = require("util");
const { validateSpec } = require("./validate");
const { generatePackage } = require("./packager");
const { preprocessSpec } = require("./preprocessSpec");

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);

const checksums = {};

const updateProgress = async () => {
  return new Promise(resolve => process.stdout.write(".", resolve));
};

const createFileWatcher = (filePath, action) => (event, filename) => {
  if (event !== "change") {
    return;
  }

  if (!filename) {
    return;
  }

  const currentChecksum = md5(fs.readFileSync(filePath));
  const previousChecksum = checksums[filePath];

  if (currentChecksum === previousChecksum) {
    return;
  }

  checksums[filePath] = currentChecksum;

  action();
};

const logMarkdown = markdown => {
  console.log(markdown);
};

const loadSpecFromFile = async file => {
  const specContents = await readFile(file, "utf8");

  const spec = JSON.parse(specContents);

  const specErrors = validateSpec(spec);

  if (specErrors) {
    console.error("The spec file has errors:", specErrors[0]);

    return;
  }

  return preprocessSpec(spec);
};

const outputPackage = async (file, packageDestination) => {
  const spec = await loadSpecFromFile(file);

  if (!spec.packageName) {
    console.error(
      "Cannot generate a package without a packageName specified in the spec file"
    );

    return;
  }

  console.log(
    `Generating a package named ${spec.packageName} at ${packageDestination}`
  );

  return generatePackage(spec.packageName, packageDestination, spec);
};

const outputMarkdown = async (file, outputDestination) => {
  const spec = await loadSpecFromFile(file);

  const markdown = renderMarkdown(spec);

  if (!outputDestination) {
    logMarkdown(markdown);

    return;
  }

  await writeFile(outputDestination, markdown);
};

class GenerateDynamoSpec extends Command {
  async run() {
    const { flags, args } = this.parse(GenerateDynamoSpec);

    if (flags.watch) {
      await outputMarkdown(args.file, flags.output);

      fs.watch(
        args.file,
        _.debounce(
          createFileWatcher(args.file, async () => {
            await outputMarkdown(args.file, flags.output);
          })
        )
      );
    } else {
      await outputMarkdown(args.file, flags.output);

      if (flags.package) {
        await outputPackage(args.file, flags.package);
      }
    }
  }
}

GenerateDynamoSpec.args = [
  { name: "file", required: true, description: "path to a valid spec file" }
];

GenerateDynamoSpec.description = `
Outputs markdown documenting the access patterns of a DynamoDB table given a valid spec file`;

GenerateDynamoSpec.flags = {
  version: flags.version({ char: "v" }),
  help: flags.help({ char: "h" }),
  output: flags.string({
    char: "o",
    description: "save rendered markdown to output file"
  }),
  package: flags.string({
    char: "p",
    description: "create a DynaGen package at this path"
  }),
  watch: flags.boolean({
    char: "w",
    default: false,
    description: "regenerate markdown when the spec file changes"
  })
};

module.exports = GenerateDynamoSpec;
