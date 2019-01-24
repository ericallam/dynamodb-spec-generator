const _ = require("lodash");

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

const sortKeyQueryMatcher = (actualValue, sort) => {
  if (_.isPlainObject(sort)) {
    const { value, maxValue, minValue } = sort;

    switch (sort.operator) {
      case "<":
        return actualValue < value;
      case "<=":
        return actualValue <= value;
      case ">":
        return actualValue > value;
      case ">=":
        return actualValue >= value;
      case "=":
        return actualValue === value;
      case "between":
        return minValue < actualValue && actualValue < maxValue;
      case "begins_with":
        return _.startsWith(actualValue, value);
    }
  }

  return actualValue === sort;
};

const recordMatchesQueryFilter = (filter, record) => {
  const {
    attribute,
    operator,
    value,
    sizeOperator,
    maxValue,
    minValue
  } = filter;

  const actualValue = record[attribute];

  switch (operator) {
    case "between":
      return minValue < actualValue && actualValue < maxValue;
    case "in":
      return _.includes(value, actualValue);
    case "attribute_exists":
      return record.hasOwnProperty(attribute);
    case "attribute_not_exists":
      return !record.hasOwnProperty(attribute);
    case "attribute_type":
      switch (value) {
        case "S":
          return _.isString(actualValue);
        case "SS":
          return _.isArray(actualValue) && _.every(actualValue, _.isString);
        case "N":
          return _.isNumber(actualValue);
        case "NS":
          return _.isArray(actualValue) && _.every(actualValue, _.isNumber);
        case "B":
          return _.isBuffer(actualValue);
        case "BS":
          return _.isArray(actualValue) && _.every(actualValue, _.isBuffer);
        case "BOOL":
          return _.isBoolean(actualValue);
        case "NULL":
          return _.isNull(actualValue);
        case "L":
          return _.isArray(actualValue);
        case "M":
          return _.isObjectLike(actualValue);
      }
    case "begins_with":
      return _.startsWith(actualValue, value);
    case "contains":
      return actualValue.includes(value);
    case "size":
      const actualSize = actualValue.length;

      switch (sizeOperator) {
        case ">":
          return actualSize > value;
        case "<":
          return actualSize < value;
        case ">=":
          return actualSize >= value;
        case "<=":
          return actualSize <= value;
        case "=":
          return actualSize === value;
      }
    case ">":
      return actualValue > value;
    case "<":
      return actualValue < value;
    case ">=":
      return actualValue >= value;
    case "<=":
      return actualValue <= value;
    case "=":
      return actualValue === value;
    case "<>":
      return actualValue !== value;
  }
};

const recordMatchesQueryCondition = (record, params, pk, sk) => {
  const recordPartitionKeyValue = record[pk];

  if (
    recordPartitionKeyValue !== resolveParamsKeyPartValue(params, "partition")
  ) {
    return false;
  }

  if (!params.sort && !params.filters) {
    return true;
  }

  if (params.sort) {
    const sk = getIndexSortKey(spec, index);

    if (!sortKeyQueryMatcher(record[sk], params.sort)) {
      return false;
    }
  }

  if (!params.filters) {
    return true;
  }

  return _.every(params.filters, filter =>
    recordMatchesQueryFilter(filter, record)
  );
};

const getKeySchemaForIndexName = (table, indexName) => {
  const index = _.find(
    table.GlobalSecondaryIndexes,
    ({ IndexName }) => IndexName === indexName
  );

  return index && index.KeySchema;
};

export default class DynamoDB {
  constructor(table, records) {
    this.table = table;
    this.records = records;
  }

  get(params = {}) {
    const keySchema = params.IndexName
      ? getKeySchemaForIndexName(this.table, params.IndexName)
      : table.KeySchema;

    const pkSchema = _.find(keySchema, ({ KeyType }) => KeyType === "HASH");
    const skSchema = _.find(keySchema, ({ KeyType }) => KeyType === "RANGE");

    const pk = pkSchema.AttributeName;
    const sk = skSchema && skSchema.AttributeName;

    const expectedPK = params.Key[pk];
    const expectedSK = params.Key[sk];

    const matchers = [];

    matchers.push(record => {
      return expectedPK === record[pk];
    });

    if (sk) {
      matchers.push(record => {
        return expectedSK === record[sk];
      });
    }

    return _.find(this.records, record => {
      return _.every(matchers, matcher => matcher(record));
    });
  }

  query(params = {}) {
    const keySchema = params.IndexName
      ? getKeySchemaForIndexName(this.table, params.IndexName)
      : table.KeySchema;

    const pkSchema = _.find(keySchema, ({ KeyType }) => KeyType === "HASH");
    const pk = pkSchema.AttributeName;
    const skSchema = _.find(keySchema, ({ KeyType }) => KeyType === "RANGE");
    const sk = skSchema && skSchema.AttributeName;

    let result = this.records.filter(record =>
      recordMatchesQueryCondition(record, params, pk, sk)
    );

    if (sk) {
      result = _.sortBy(result, record => _.toInteger(record[sk]));
    }

    if (sk && !params.ScanIndexForward) {
      result.reverse();
    }

    return result;
  }
}
