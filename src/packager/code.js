const prettier = require("prettier");
const _ = require("lodash");

const format = code => {
  return prettier.format(code, { parser: "babylon" });
};

const {
  resolveAttributeType,
  resolveAttributeKeyType,
  resolveMappedAttributeName,
  resolveIndexKey,
  resolveIndexPartitionKey,
  resolveIndexSortKey
} = require("./resolvers");

const partitionAttributeName = (accessPattern, spec) => {
  const indexSpec = spec.indexes[accessPattern.index];

  return resolveMappedAttributeName(
    "partition",
    indexSpec,
    accessPattern.attributeMap
  );
};

const sortAttributeName = (accessPattern, spec) => {
  const indexSpec = spec.indexes[accessPattern.index];

  return resolveMappedAttributeName(
    "sort",
    indexSpec,
    accessPattern.attributeMap
  );
};

const functionName = accessPattern => {
  return _.camelCase(accessPattern.name);
};

const partitionAttributeType = (accessPattern, spec) => {
  return resolveAttributeKeyType("partition", accessPattern, spec);
};

const sortAttributeType = (accessPattern, spec) => {
  return resolveAttributeKeyType("sort", accessPattern, spec);
};

const sortArgList = (accessPattern, spec) => {
  if (!accessPattern.params.sort) {
    return "";
  }

  if (
    accessPattern.params.sort &&
    accessPattern.params.sort.operator === "between"
  ) {
    return _.join(
      [
        `${sortAttributeName(accessPattern, spec)}Min: ${sortAttributeType(
          accessPattern,
          spec
        )}`,
        `${sortAttributeName(accessPattern, spec)}Max: ${sortAttributeType(
          accessPattern,
          spec
        )}`
      ],
      ", "
    );
  }

  return _.join(
    _.compact([
      sortAttributeName(accessPattern, spec),
      sortAttributeType(accessPattern, spec)
    ]),
    ": "
  );
};

const argsList = (accessPattern, spec) => {
  const partitionArgument = _.join(
    _.compact([
      partitionAttributeName(accessPattern, spec),
      partitionAttributeType(accessPattern, spec)
    ]),
    ": "
  );

  const sortArgument = sortArgList(accessPattern, spec);

  const args = _.join(_.compact([partitionArgument, sortArgument]), ", ");

  return args;
};

const typeName = accessPattern => {
  return _.upperFirst(functionName(accessPattern));
};

const partitionInterface = (accessPattern, spec) => {
  return `${partitionAttributeName(
    accessPattern,
    spec
  )}: ${partitionAttributeType(accessPattern, spec)}`;
};

const sortInterface = (accessPattern, spec) => {
  const indexSpec = spec.indexes[accessPattern.index];

  const sortInterface = indexSpec.sort
    ? `${sortAttributeName(accessPattern, spec)}: ${sortAttributeType(
        accessPattern,
        spec
      )}`
    : undefined;

  return sortInterface;
};

const requiredInterfaceFields = (accessPattern, spec) => {
  return _.join(
    _.compact([
      partitionInterface(accessPattern, spec),
      sortInterface(accessPattern, spec)
    ]),
    ";\n"
  );
};

const optionalInterfaceFields = (accessPattern, spec) => {
  const otherFields = _.omit(accessPattern.attributeMap, ["partition", "sort"]);

  let otherFieldsCode = "";

  Object.keys(otherFields).forEach(name => {
    const mappedName = otherFields[name];
    const otherFieldType = resolveAttributeType(name, spec);

    otherFieldsCode = `${otherFieldsCode};\n${mappedName}?: ${otherFieldType}`;
  });

  return otherFieldsCode;
};

const mapItemAttributes = (accessPattern, spec) => {
  const mappings = Object.keys(accessPattern.attributeMap).map(name => {
    const mappedName = accessPattern.attributeMap[name];

    let attributeName = name;

    if (attributeName === "partition" || attributeName === "sort") {
      attributeName = resolveIndexKey(spec, attributeName, accessPattern.index);
    }

    return _.join(
      [
        `result['${mappedName}'] = result['${attributeName}']`,
        `delete result['${attributeName}']`
      ],
      ";\n"
    );
  });

  return _.join(mappings, ";\n\n");
};

const querySortCondition = (sort, sk) => {
  const defaultOperatorResolver = () => `#${sk} ${sort.operator || "="} :${sk}`;

  const operators = {
    begins_with: () => `begins_with(#${sk}, :${sk})`,
    between: () => `#${sk} BETWEEN :${sk}Min AND :${sk}Max`
  };

  return (operators[_.toLower(sort.operator)] || defaultOperatorResolver)();
};

const keyConditionExpressionParam = (accessPattern, spec) => {
  const pk = resolveIndexPartitionKey(spec, accessPattern.index);
  const sk = resolveIndexSortKey(spec, accessPattern.index);

  if (!accessPattern.params.sort) {
    return `params.KeyConditionExpression = "#${pk} = :${pk}"`;
  }

  const conditionCode = `#${pk} = :${pk} and ${querySortCondition(
    accessPattern.params.sort,
    sk
  )}`;

  return `params.KeyConditionExpression = "${conditionCode}";`;
};

const expressionAttributeNamesParam = (accessPattern, spec) => {
  const pk = resolveIndexPartitionKey(spec, accessPattern.index);
  const sk = resolveIndexSortKey(spec, accessPattern.index);

  return `
    const expressionAttributeNames = {};
    expressionAttributeNames['#${pk}'] = "${pk}";
    ${
      accessPattern.params.sort
        ? `expressionAttributeNames['#${sk}'] = "${sk}";`
        : ""
    };
    params.ExpressionAttributeNames = expressionAttributeNames;

  `;
};

const expressionAttributeValuesParam = (accessPattern, spec) => {
  const pk = resolveIndexPartitionKey(spec, accessPattern.index);
  const sk = resolveIndexSortKey(spec, accessPattern.index);

  const partitionArgumentName = partitionAttributeName(accessPattern, spec);
  const sortArgumentName = sortAttributeName(accessPattern, spec);

  let sortKeyAttributeValues;

  if (
    accessPattern.params.sort &&
    accessPattern.params.sort.operator === "between"
  ) {
    sortKeyAttributeValues = `
      expressionAttributeValues[':${sk}Min'] = ${sortArgumentName}Min;
      expressionAttributeValues[':${sk}Max'] = ${sortArgumentName}Max;
    `;
  } else if (!accessPattern.params.sort) {
    sortKeyAttributeValues = "";
  } else {
    sortKeyAttributeValues = `expressionAttributeValues[':${sk}'] = ${sortArgumentName};`;
  }

  return `
    const expressionAttributeValues = {};
    expressionAttributeValues[':${pk}'] = ${partitionArgumentName};
    ${sortKeyAttributeValues}
    params.ExpressionAttributeValues = expressionAttributeValues;

  `;
};

const scanIndexForwardQueryParam = (accessPattern, spec) => {
  if (accessPattern.params.order && accessPattern.params.order === "DESC") {
    return `params.ScanIndexFoward = false;`;
  } else {
    return "";
  }
};

const indexNameParam = (accessPattern, spec) => {
  if (accessPattern.index !== "main") {
    return `params.IndexName = "${accessPattern.index}";`;
  } else {
    return "";
  }
};

const filterQueryParam = (accessPattern, spec) => {
  if (accessPattern.params.filters) {
    return `console.warn("DynamoDB query filter support is not supported yet in generated code");`;
  } else {
    return "";
  }
};

const limitQueryParam = accessPattern => {
  if (accessPattern.params.limit) {
    return `console.warn("DynamoDB query limit support is not supported yet in generated code");`;
  } else {
    return "";
  }
};

module.exports = {
  format,
  partitionAttributeName,
  sortAttributeName,
  functionName,
  partitionAttributeType,
  sortAttributeType,
  argsList,
  typeName,
  requiredInterfaceFields,
  optionalInterfaceFields,
  mapItemAttributes,
  keyConditionExpressionParam,
  expressionAttributeNamesParam,
  expressionAttributeValuesParam,
  scanIndexForwardQueryParam,
  indexNameParam,
  filterQueryParam,
  limitQueryParam
};
