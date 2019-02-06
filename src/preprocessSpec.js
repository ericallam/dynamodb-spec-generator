const _ = require("lodash");

const normalizeTableDefinition = spec => {
  const normalizedSpec = { ...spec };
  const {
    tableDefinition: {
      TableName,
      AttributeDefinitions,
      KeySchema,
      GlobalSecondaryIndexes
    }
  } = spec;

  normalizedSpec.tableName = TableName;
  normalizedSpec.attributes = AttributeDefinitions.reduce(
    (memo, definition) => {
      memo[definition.AttributeName] = { type: definition.AttributeType };
      return memo;
    },
    {}
  );

  normalizedSpec.indexes = {
    main: KeySchema.reduce((memo, key) => {
      memo[key.KeyType === "HASH" ? "partition" : "sort"] = key.AttributeName;
      return memo;
    }, {})
  };

  if (GlobalSecondaryIndexes) {
    GlobalSecondaryIndexes.forEach(index => {
      normalizedSpec.indexes[index.IndexName] = index.KeySchema.reduce(
        (memo, key) => {
          memo[key.KeyType === "HASH" ? "partition" : "sort"] =
            key.AttributeName;
          return memo;
        },
        {}
      );

      if (!index.Projection) {
        normalizedSpec.indexes[index.IndexName].projection = "all";
      } else {
        normalizedSpec.indexes[index.IndexName].projection = _.toLower(
          index.Projection.ProjectionType
        );

        if (index.Projection.NonKeyAttributes) {
          normalizedSpec.indexes[index.IndexName].projectionKeys =
            index.Projection.NonKeyAttributes;
        }
      }
    });
  }

  return normalizedSpec;
};

const preprocessSpec = spec => {
  if (spec.tableDefinition) {
    return normalizeTableDefinition(spec);
  }

  return spec;
};

module.exports = {
  preprocessSpec
};
