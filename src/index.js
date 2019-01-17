const fs = require("fs");
const md5 = require("md5");
const _ = require("lodash");
const { Command, flags } = require("@oclif/command");
const { renderMarkdown } = require("./render");
const { promisify } = require("util");
const { validateSpec } = require("./validate");

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

const outputMarkdown = async (file, outputDestination) => {
  const specContents = await readFile(file, "utf8");

  const spec = JSON.parse(specContents);

  const specErrors = validateSpec(spec);

  if (specErrors) {
    console.error("The spec file has errors:", specErrors[0]);

    return;
  }

  const markdown = renderMarkdown(spec);

  if (!outputDestination) {
    logMarkdown(markdown);

    return;
  }

  await updateProgress();
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
  watch: flags.boolean({
    char: "w",
    default: false,
    description: "regenerate markdown when the spec file changes"
  })
};

module.exports = GenerateDynamoSpec;
