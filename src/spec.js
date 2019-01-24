const _ = require("lodash");

const getParamsKeyPartValue = (params, keyPart) => {
  if (_.isPlainObject(params[keyPart])) {
    return params[keyPart].value;
  }

  return params[keyPart];
};

const getIndexPrimaryKeyAttributes = indexSpec => {
  return _.compact([
    getIndexPartitionAttributeName(indexSpec),
    getIndexSortAttributeName(indexSpec)
  ]);
};

const getAllRecordsInIndex = (records, indexSpec) => {
  const requiredAttributes = getIndexPrimaryKeyAttributes(indexSpec);

  return records.filter(record => {
    return _.every(requiredAttributes, attribute =>
      record.hasOwnProperty(attribute)
    );
  });
};

const getTableDefinition = spec => spec.tableDefinition;
const getTableName = spec => spec.tableDefinition.TableName;
const getIndexSpec = (spec, indexName) => {
  if (indexName == "main") {
    return getMainIndex(spec);
  }

  return _.find(
    spec.tableDefinition.GlobalSecondaryIndexes,
    def => def.IndexName === indexName
  );
};

const getMainIndex = spec => {
  const result = _.pick(spec.tableDefinition, [
    "KeySchema",
    "ProvisionedThroughput"
  ]);

  result.IndexName = "main";

  return result;
};

const getIndexPartitionAttributeName = indexSpec => {
  const schema = _.find(
    indexSpec.KeySchema,
    ({ KeyType }) => KeyType === "HASH"
  );

  return schema && schema.AttributeName;
};

const getIndexSortAttributeName = indexSpec => {
  const schema = _.find(
    indexSpec.KeySchema,
    ({ KeyType }) => KeyType === "RANGE"
  );

  return schema && schema.AttributeName;
};

const getIndexName = indexSpec => indexSpec.IndexName;

const getIndexes = spec => {
  return [getMainIndex(spec)].concat(spec.GlobalSecondaryIndexes);
};

module.exports = {
  getAllRecordsInIndex,
  getAllRecordsMatchingAccessPattern,
  getParamsKeyPartValue,
  getTableDefinition,
  getTableName,
  getIndexSpec,
  getIndexPartitionAttributeName,
  getIndexSortAttributeName,
  getIndexName,
  getIndexes
};
