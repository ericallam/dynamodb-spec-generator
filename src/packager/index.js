const _ = require("lodash");

const path = require("path");
const { generatePackageJSON } = require("./packageDefinition");
const {
  resolveIndexSortKey,
  resolveIndexPartitionKey
} = require("./resolvers");

const { safeMkdir, safeRmdir, writeFile } = require("./fileHelpers");

const {
  format,
  typeName,
  requiredInterfaceFields,
  optionalInterfaceFields,
  functionName,
  argsList,
  partitionAttributeName,
  sortAttributeName,
  mapItemAttributes,
  scanIndexForwardQueryParam,
  limitQueryParam,
  filterQueryParam,
  indexNameParam,
  keyConditionExpressionParam,
  expressionAttributeNamesParam,
  expressionAttributeValuesParam
} = require("./code");

const generateGetFunctionCode = (accessPattern, spec) => {
  const t = typeName(accessPattern, spec);

  const pk = resolveIndexPartitionKey(spec, accessPattern.index);
  const sk = resolveIndexSortKey(spec, accessPattern.index);

  return format(`
    interface ${t}ItemAttributes {
      ${requiredInterfaceFields(accessPattern, spec)}
      ${optionalInterfaceFields(accessPattern, spec)}
    }

    interface ${t}ItemOther {
      [key: string]: any;
    }

    export type ${t}Item = ${t}ItemAttributes & ${t}ItemOther;

    export type ${t}Result = ${t}Item | null;

    export const ${functionName(accessPattern)} = async (${argsList(
    accessPattern,
    spec
  )}, documentClient: any): Promise<${t}Result> => {
      const params: any = {};

      params.Key = {
        "${pk}": ${partitionAttributeName(accessPattern, spec)},
        "${sk}": ${sortAttributeName(accessPattern, spec)}
      }

      ${indexNameParam(accessPattern, spec)};

      const response = await documentClient.get(params);

      if (!response.Item) {
        return null;
      }

      const mapItemAttributes = (item) => {
        const result = { ...item };

        ${mapItemAttributes(accessPattern, spec)}

        return result;
      }

      return mapItemAttributes(response.Item);
    }
  `);
};

const generateQueryFunctionCode = (accessPattern, spec) => {
  const t = typeName(accessPattern, spec);

  return format(`
    interface ${t}ItemAttributes {
      ${requiredInterfaceFields(accessPattern, spec)}
      ${optionalInterfaceFields(accessPattern, spec)}
    }

    interface ${t}ItemOther {
      [key: string]: any;
    }

    export type ${t}Item = ${t}ItemAttributes & ${t}ItemOther;

    export const ${functionName(accessPattern)} = async (${argsList(
    accessPattern,
    spec
  )}, documentClient: any): Promise<${t}Item[]> => {
      const params: any = {};

      ${keyConditionExpressionParam(accessPattern, spec)};
      ${expressionAttributeNamesParam(accessPattern, spec)};
      ${expressionAttributeValuesParam(accessPattern, spec)};

      ${scanIndexForwardQueryParam(accessPattern)};
      ${indexNameParam(accessPattern, spec)};
      ${filterQueryParam(accessPattern, spec)};
      ${limitQueryParam(accessPattern, spec)};

      const response = await documentClient.query(params);

      const mapItemAttributes = (item) => {
        const result = { ...item };

        ${mapItemAttributes(accessPattern, spec)}

        return result;
      }

      return response.Items.map(mapItemAttributes);
    }
  `);
};

const writeAccessPatternFile = async (accessPattern, spec, directory) => {
  if (!accessPattern.name) {
    return undefined;
  }

  const code =
    accessPattern.type === "get"
      ? generateGetFunctionCode(accessPattern, spec)
      : generateQueryFunctionCode(accessPattern, spec);

  const filePath = path.join(directory, `${accessPattern.name}.ts`);

  return writeFile(filePath, code);
};

const generatePackage = async (packageName, destination, spec) => {
  console.log(`Changing to directory ${destination}`);

  await safeRmdir(destination);
  await safeMkdir(destination, { recursive: true });

  process.chdir(destination);

  await writeFile(
    "package.json",
    generatePackageJSON(packageName, spec),
    "utf8"
  );

  const srcDirPath = "./src";

  await safeMkdir(srcDirPath);

  const accessPatternsDirPath = path.join(srcDirPath, "accessPatterns");

  await safeMkdir(accessPatternsDirPath);

  const accessPatternFiles = _.compact(
    spec.accessPatterns.map(accessPattern =>
      writeAccessPatternFile(accessPattern, spec, accessPatternsDirPath)
    )
  );

  await Promise.all(accessPatternFiles);
};

module.exports = {
  generatePackage
};
