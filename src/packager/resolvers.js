const _ = require("lodash");

const resolveMappedAttributeName = (name, indexSpec, attributeMap) => {
  if (!attributeMap[name]) {
    return indexSpec[name] || name;
  }

  return attributeMap[name];
};

const resolveAttributeType = (attributeName, spec) => {
  const attributeDefinitions = spec.tableDefinition.AttributeDefinitions;
  const attributeDefinition = _.find(
    attributeDefinitions,
    def => def.AttributeName === attributeName
  );

  if (attributeDefinition) {
    switch (attributeDefinition.AttributeType) {
      case "S":
        return "string";
      case "N":
        return "number";
      case "B":
        return "Buffer";
    }
  } else {
    return "any";
  }
};

const resolveIndexKey = (spec, key, indexName) => {
  return spec.indexes[indexName][key];
};

const resolveIndexSortKey = (spec, indexName) => {
  return resolveIndexKey(spec, "sort", indexName);
};

const resolveIndexPartitionKey = (spec, indexName) => {
  return resolveIndexKey(spec, "partition", indexName);
};

const resolveAttributeKeyType = (key, accessPattern, spec) => {
  const indexSpec = spec.indexes[accessPattern.index];
  const attributeName = indexSpec[key];

  if (!attributeName) {
    return undefined;
  }

  return resolveAttributeType(attributeName, spec);
};

module.exports = {
  resolveAttributeType,
  resolveIndexSortKey,
  resolveIndexPartitionKey,
  resolveAttributeKeyType,
  resolveMappedAttributeName,
  resolveIndexKey
};
