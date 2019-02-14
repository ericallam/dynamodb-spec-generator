const _ = require("lodash");
const u = require("unist-builder");
const toc = require("mdast-util-toc");
const prettier = require("prettier");

const format = code => prettier.format(code, { parser: "babylon" });

const h = (depth, value) => u("heading", { depth }, [t(value)]);
const p = value => u("paragraph", [u("text", { value })]);
const t = value => u("text", { value });

const collapsibleSection = (summary, content) => {
  const frontMatter = [
    u("html", {
      value: "<details>"
    }),
    u("html", {
      value: `<summary>${summary}</summary>`
    })
  ];

  return frontMatter
    .concat(content)
    .concat([u("html", { value: "</details>" })]);
};

const generateTableParamsSection = tableSpec => {
  return collapsibleSection(
    "Params to create the table using the CLI or the AWS SDK:",
    [
      u("paragraph", [
        u("code", {
          lang: "json",
          value: JSON.stringify(tableSpec, null, 2)
        })
      ])
    ]
  );
};

const generateTableUsageSection = spec => {
  return [
    u("paragraph", [
      u("inlineCode", { value: "createTable" }),
      t(" Using the CLI:")
    ]),
    u("code", {
      lang: "bash",
      value: `$ aws dynamodb create-table --table-name ${
        spec.tableName
      } --cli-input-json create-table.json`
    }),
    p("Using the AWS SDK:"),
    u("code", {
      lang: "javascript",
      value: format(`
        const DynamoDB = require("aws-sdk/clients/dynamodb");

        const service = new DynamoDB({ region: process.env.AWS_REGION });

        service.createTable(tableJson, (err, data) => {
          console.log(data);
        });`)
    })
  ];
};

const generateTableSpec = spec => {
  const tableSpec = spec.tableDefinition;

  const header = [h(2, "Table Spec")];

  return header
    .concat(generateTableParamsSection(tableSpec))
    .concat(generateTableUsageSection(spec));
};

const externalLinks = {
  query: u(
    "link",
    {
      title: "DocumentClient.query",
      url:
        "http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#query-property"
    },
    [t("DocumentClient.query")]
  ),
  get: u(
    "link",
    {
      title: "DocumentClient.get",
      url:
        "http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#get-property"
    },
    [t("DocumentClient.get")]
  )
};

const getIndexSortKey = (spec, indexName) => {
  return spec.indexes[indexName].sort;
};

const getIndexPartitionKey = (spec, indexName) => {
  return spec.indexes[indexName].partition;
};

const resolveQueryConditionCode = (operator, sk) => {
  const defaultOperatorResolver = () => `#${sk} ${operator} :${sk}`;

  const operators = {
    begins_with: () => `begins_with(#${sk}, :${sk})`,
    between: () => `#${sk} BETWEEN :${sk}Min AND :${sk}Max`
  };

  return (operators[_.toLower(operator)] || defaultOperatorResolver)();
};

const generateSortKeyConditionCode = (spec, accessPattern) => {
  const sortKey = getIndexSortKey(spec, accessPattern.index);

  return u("inlineCode", {
    value: resolveQueryConditionCode(
      accessPattern.params.sort.operator,
      sortKey
    )
  });
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

const recordMatchesQueryCondition = (spec, record, accessPattern) => {
  const { params, index } = accessPattern;

  const pk = getIndexPartitionKey(spec, index);

  const recordPartitionKeyValue = record[pk];

  if (
    recordPartitionKeyValue !== resolveParamsKeyPartValue(params, "partition")
  ) {
    return false;
  }

  const sk = getIndexSortKey(spec, index);

  if (!params.sort && !params.filters) {
    return record.hasOwnProperty(sk);
  }

  if (params.sort) {
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

const createRecordCompareForKey = key => {
  return (firstRecord, secondRecord) => {
    if (_.isString(firstRecord[key])) {
      return firstRecord[key].localeCompare(secondRecord[key], "en", {
        numeric: true
      });
    } else {
      if (firstRecord[key] < secondRecord[key]) {
        return -1;
      } else if (firstRecord[key] > secondRecord[key]) {
        return 1;
      } else {
        return 0;
      }
    }
  };
};

const orderRecords = (records, key, order) => {
  records.sort((firstRecord, secondRecord) => {
    const firstRecordValue = firstRecord[key];
    const secondRecordValue = secondRecord[key];

    if (_.isString(firstRecordValue)) {
      return firstRecordValue.localeCompare(secondRecordValue, "en", {
        numeric: true
      });
    } else {
      if (firstRecordValue < secondRecordValue) {
        return -1;
      } else if (firstRecordValue > secondRecordValue) {
        return 1;
      }

      return 0;
    }
  });

  if (order === "DESC") {
    records.reverse();
  }
};

const queryRecords = (spec, accessPattern) => {
  let result = spec.records.filter(record =>
    recordMatchesQueryCondition(spec, record, accessPattern)
  );

  const indexSpec = spec.indexes[accessPattern.index];

  if (indexSpec.sort) {
    const sk = getIndexSortKey(spec, accessPattern.index);

    orderRecords(result, sk, accessPattern.params.order || "ASC");
  }

  if (accessPattern.params.limit) {
    result = _.slice(result, 0, accessPattern.params.limit);
  }

  return result;
};

const getRecord = (spec, accessPattern) => {
  const { params, index } = accessPattern;

  const pk = getIndexPartitionKey(spec, index);
  const sk = getIndexSortKey(spec, index);

  return _.find(spec.records, record => {
    const recordPartitionKeyValue = record[pk];
    const recordSortKeyValue = record[sk];

    return (
      recordPartitionKeyValue ===
        resolveParamsKeyPartValue(params, "partition") &&
      recordSortKeyValue === resolveParamsKeyPartValue(params, "sort")
    );
  });
};

const findAllRecordsMatchingAccessPattern = (spec, accessPattern) => {
  if (accessPattern.type === "query") {
    return queryRecords(spec, accessPattern);
  }

  return _.compact([getRecord(spec, accessPattern)]);
};

const generateFilterExpressionConditionIntro = (spec, accessPattern) => {
  if (!accessPattern.params.filters) {
    return [t(":")];
  }

  return [t(" with filter params:")];
};

const generateSortKeyConditionIntro = (spec, accessPattern) => {
  if (!accessPattern.params.sort) {
    return [];
  }

  return [
    t(" with a "),
    generateSortKeyConditionCode(spec, accessPattern),
    t(" condition on the sort key")
  ];
};

const resolveKeyConditionExpression = (spec, accessPattern) => {
  const pk = getIndexPartitionKey(spec, accessPattern.index);
  const sk = getIndexSortKey(spec, accessPattern.index);

  if (!accessPattern.params.sort) {
    return `#${pk} = :${pk}`;
  }

  return `#${pk} = :${pk} and ${resolveQueryConditionCode(
    accessPattern.params.sort.operator,
    sk
  )}`;
};

const resolveExpressionAttributeValues = (spec, accessPattern) => {
  const pk = getIndexPartitionKey(spec, accessPattern.index);
  const sk = getIndexSortKey(spec, accessPattern.index);

  const result = {
    [`:${pk}`]: resolveParamsKeyPartValue(accessPattern.params, "partition")
  };

  if (accessPattern.params.sort) {
    if (_.toLower(accessPattern.params.sort.operator) === "between") {
      Object.assign(result, {
        [`:${sk}Min`]: accessPattern.params.sort.minValue,
        [`:${sk}Max`]: accessPattern.params.sort.maxValue
      });
    } else {
      Object.assign(result, {
        [`:${sk}`]: resolveParamsKeyPartValue(accessPattern.params, "sort")
      });
    }
  }

  return result;
};

const resolveExpressionAttributeNames = (spec, accessPattern) => {
  const pk = getIndexPartitionKey(spec, accessPattern.index);
  const sk = getIndexSortKey(spec, accessPattern.index);

  const result = { [`#${pk}`]: pk };

  if (accessPattern.params.sort) {
    Object.assign(result, { [`#${sk}`]: sk });
  }

  return result;
};

const generateQueryRequest = (depth, spec, accessPattern) => {
  const introProse = [
    u(
      "paragraph",
      [
        t("Perform a "),
        externalLinks.query,
        t(` against the ${_.upperFirst(accessPattern.index)} index`)
      ]
        .concat(generateSortKeyConditionIntro(spec, accessPattern))
        .concat(generateFilterExpressionConditionIntro(spec, accessPattern))
    )
  ];

  const queryParamsSpec = {
    TableName: spec.tableName,
    KeyConditionExpression: resolveKeyConditionExpression(spec, accessPattern),
    ExpressionAttributeNames: resolveExpressionAttributeNames(
      spec,
      accessPattern
    ),
    ExpressionAttributeValues: resolveExpressionAttributeValues(
      spec,
      accessPattern
    )
  };

  if (accessPattern.params.order && accessPattern.params.order === "DESC") {
    queryParamsSpec.ScanIndexFoward = false;
  }

  if (accessPattern.index !== "main") {
    queryParamsSpec.IndexName = accessPattern.index;
  }

  if (accessPattern.params.filters) {
    const filterExpressions = accessPattern.params.filters.map(filter => {
      switch (filter.operator) {
        case "between":
          return `#${filter.attribute} BETWEEN :${filter.attribute}Min AND :${
            filter.attribute
          }Max`;
        case "in":
          return `#${filter.attribute} IN (${_.join(
            filter.value.map((_v, i) => `:${filter.attribute}${i}`),
            ", "
          )})`;
        case "attribute_exists":
          return `attribute_exists(#${filter.attribute})`;
        case "attribute_not_exists":
          return `attribute_not_exists(#${filter.attribute})`;
        case "attribute_type":
          return `attribute_type(#${filter.attribute}, :${
            filter.attribute
          }_type)`;
        case "begins_with":
          return `begins_with(#${filter.attribute}, :${filter.attribute})`;
        case "contains":
          return `contains(#${filter.attribute}, :${filter.attribute})`;
        case "size":
          return `size(#${filter.attribute}) ${filter.sizeOperator} :${
            filter.attribute
          }`;
        default:
          return `#${filter.attribute} ${filter.operator} :${filter.attribute}`;
      }
    });

    queryParamsSpec.FilterExpression = _.join(filterExpressions, " AND ");

    accessPattern.params.filters.forEach(filter => {
      queryParamsSpec.ExpressionAttributeNames[`#${filter.attribute}`] =
        filter.attribute;

      switch (filter.operator) {
        case "between":
          queryParamsSpec.ExpressionAttributeValues[`:${filter.attribute}Min`] =
            filter.minValue;
          queryParamsSpec.ExpressionAttributeValues[`:${filter.attribute}Max`] =
            filter.maxValue;
          break;
        case "in":
          filter.value.forEach((value, i) => {
            queryParamsSpec.ExpressionAttributeValues[
              `:${filter.attribute}${i}`
            ] = value;
          });
          break;
        case "attribute_type":
          queryParamsSpec.ExpressionAttributeValues[
            `:${filter.attribute}_type`
          ] = filter.value;
          break;
        case "attribute_exists":
        case "attribute_not_exists":
          break;
        default:
          queryParamsSpec.ExpressionAttributeValues[`:${filter.attribute}`] =
            filter.value;
      }
    });
  }

  if (accessPattern.params.limit) {
    queryParamsSpec.Limit = accessPattern.params.limit;
  }

  const params = [
    u("code", {
      lang: "json",
      value: JSON.stringify(queryParamsSpec, null, 2)
    })
  ];

  const recordsSection = generateAccessPatternRecordsSection(
    spec,
    accessPattern,
    depth
  );

  const dynagenSection = generateAccessPatternDynagenSection(
    spec,
    accessPattern,
    depth
  );

  return introProse
    .concat(params)
    .concat(recordsSection)
    .concat(dynagenSection);
};

const generateAccessPatternRecordsSection = (spec, accessPattern, depth) => {
  const indexSpec = spec.indexes[accessPattern.index];

  let recordsSection;

  const matchingRecords = findAllRecordsMatchingAccessPattern(
    spec,
    accessPattern
  );

  if (matchingRecords.length) {
    recordsSection = [h(depth + 1, "DynamoDB Records")].concat(
      generateTable(spec, accessPattern.index, indexSpec, matchingRecords)
    );
  } else {
    recordsSection = [];
  }

  return recordsSection;
};

const resolveParamsKeyPartValue = (params, keyPart) => {
  if (_.isPlainObject(params[keyPart])) {
    return params[keyPart].value;
  }

  return params[keyPart];
};

const resolveDynagenUsageCode = (functionName, accessPattern, spec) => {
  const resolveDynagenUsageFunctionArguments = () => {
    const codeArguments = [];

    codeArguments.push(
      `"${resolveParamsKeyPartValue(accessPattern.params, "partition")}"`
    );

    if (accessPattern.params.sort) {
      codeArguments.push(
        `"${resolveParamsKeyPartValue(accessPattern.params, "sort")}"`
      );
    }

    return _.join(codeArguments, ", ");
  };

  const resolveDynagenUsageVariableName = () => {
    return accessPattern.type === "query" ? "items" : "item";
  };

  return format(
    `
    const { ${functionName} } = require("${spec.packageName}");

    const ${resolveDynagenUsageVariableName()} = await ${functionName}(${resolveDynagenUsageFunctionArguments()})
    `
  );
};

const generateAccessPatternDynagenSection = (spec, accessPattern, depth) => {
  if (!accessPattern.name) {
    return [];
  }

  const indexSpec = spec.indexes[accessPattern.index];

  let dynagenSection = [
    h(depth + 1, "DynaGen Usage"),
    u("paragraph", [
      t("Use the generated function "),
      u("inlineCode", {
        value: `${accessPattern.name}()`
      })
    ]),
    u("code", {
      lang: "javascript",
      value: resolveDynagenUsageCode(accessPattern.name, accessPattern, spec)
    })
  ];

  const matchingRecords = findAllRecordsMatchingAccessPattern(
    spec,
    accessPattern
  );

  if (matchingRecords.length) {
    const table = generateTable(
      spec,
      accessPattern.index,
      indexSpec,
      matchingRecords,
      accessPattern.attributeMap
    );

    dynagenSection = dynagenSection.concat(
      [h(depth + 2, `Mapped Records`)].concat(table)
    );
  }

  return dynagenSection;
};

const generateGetRequest = (depth, spec, accessPattern) => {
  const pk = getIndexPartitionKey(spec, accessPattern.index);
  const sk = getIndexSortKey(spec, accessPattern.index);

  const introProse = [
    u("paragraph", [
      t("Perform a "),
      externalLinks.get,
      t(` against the ${_.upperFirst(accessPattern.index)} index: `)
    ])
  ];

  const params = [
    u("code", {
      lang: "json",
      value: JSON.stringify(
        {
          TableName: spec.tableName,
          Key: {
            [pk]: resolveParamsKeyPartValue(accessPattern.params, "partition"),
            [sk]: resolveParamsKeyPartValue(accessPattern.params, "sort")
          }
        },
        null,
        2
      )
    })
  ];

  const records = generateAccessPatternRecordsSection(
    spec,
    accessPattern,
    depth
  );

  const dynagenSection = generateAccessPatternDynagenSection(
    spec,
    accessPattern,
    depth
  );

  return introProse
    .concat(params)
    .concat(records)
    .concat(dynagenSection);
};

const generateAccessPatternHeader = (depth, spec, accessPattern) => {
  return [h(depth, accessPattern.title)].concat(
    accessPattern.description
      ? [u("blockquote", [t(accessPattern.description)])]
      : []
  );
};

const generateAccessPatternRequest = (depth, spec, accessPattern) => {
  if (!accessPattern.type || !accessPattern.params) {
    return [u("paragraph", [u("emphasis", [t("coming soon")])])];
  }

  if (accessPattern.type === "query") {
    return generateQueryRequest(depth, spec, accessPattern);
  }

  return generateGetRequest(depth, spec, accessPattern);
};

const generateAccessPattern = (depth, spec, accessPattern) => {
  return generateAccessPatternHeader(depth, spec, accessPattern).concat(
    generateAccessPatternRequest(depth, spec, accessPattern)
  );
};

const generateAccessPatterns = spec => {
  if (!spec.accessPatterns) {
    return [];
  }

  return [h(2, "Access Patterns")].concat(
    spec.accessPatterns.reduce(
      (result, accessPatternSpec) =>
        result.concat(generateAccessPattern(3, spec, accessPatternSpec)),
      []
    )
  );
};

const getAllRecordsInIndex = (records, indexSpec) => {
  const requiredAttributes = _.compact([indexSpec.partition, indexSpec.sort]);

  return records.filter(record => {
    return _.every(requiredAttributes, attribute =>
      record.hasOwnProperty(attribute)
    );
  });
};

const resolveMappedAttributeName = (name, indexSpec, attributeMap) => {
  if (!attributeMap[name]) {
    return indexSpec[name] || name;
  }

  return attributeMap[name];
};

const generateTableHeader = (indexSpec, attributeMap = {}) => {
  const partitionAttributeName = resolveMappedAttributeName(
    "partition",
    indexSpec,
    attributeMap
  );

  const sortAttributeName = resolveMappedAttributeName(
    "sort",
    indexSpec,
    attributeMap
  );

  return [
    u(
      "tableRow",
      _.compact([
        u("tableCell", [t(`${partitionAttributeName} (HASH)`)]),
        indexSpec.sort
          ? u("tableCell", [t(`${sortAttributeName} (RANGE)`)])
          : null
      ])
    )
  ];
};

const generateTableRecordPrimaryKeyCells = (
  spec,
  indexName,
  indexSpec,
  record
) => {
  const result = [];

  result.push(u("tableCell", [t(record[indexSpec.partition])]));

  if (indexSpec.sort) {
    result.push(u("tableCell", [t(record[indexSpec.sort])]));
  }

  return result;
};

const generateTableRecordValue = (columnName, value) => {
  if (typeof value === "string" || typeof value === "number") {
    return [
      u("strong", [u("text", { value: `${columnName}:` })]),
      u("text", { value: ` ${value}` })
    ];
  }

  return [
    u("strong", [u("text", { value: `${columnName}:` })]),
    u("text", { value: " " }),
    u("inlineCode", {
      value: `${_.truncate(JSON.stringify(value), {
        length: 24,
        separator: /[,:]? +/,
        omission: "... }"
      })}`
    })
  ];
};

const generateTableRecordAttributeCells = (indexSpec, record, attributeMap) => {
  const primaryKeyAttributes = _.compact([indexSpec.partition, indexSpec.sort]);

  return Object.keys(_.omit(record, primaryKeyAttributes)).map(key => {
    return u(
      "tableCell",
      generateTableRecordValue(
        resolveMappedAttributeName(key, indexSpec, attributeMap),
        record[key]
      )
    );
  });
};

const generateTableRecord = (
  spec,
  indexName,
  indexSpec,
  record,
  attributeMap = {}
) => {
  return u(
    "tableRow",
    generateTableRecordPrimaryKeyCells(
      spec,
      indexName,
      indexSpec,
      record
    ).concat(generateTableRecordAttributeCells(indexSpec, record, attributeMap))
  );
};

const generateTableRecords = (
  spec,
  indexName,
  indexSpec,
  records,
  attributeMap = {}
) => {
  return records.map(record =>
    generateTableRecord(spec, indexName, indexSpec, record, attributeMap)
  );
};

const generateTable = (
  spec,
  indexName,
  indexSpec,
  records,
  attributeMap = {}
) => {
  return [
    u(
      "table",
      generateTableHeader(indexSpec, attributeMap).concat(
        generateTableRecords(spec, indexName, indexSpec, records, attributeMap)
      )
    )
  ];
};

const generateIndex = (depth, spec, indexName, indexSpec) => {
  const records = getAllRecordsInIndex(spec.records, indexSpec);

  return [h(3, _.upperFirst(indexName))].concat(
    generateTable(spec, indexName, indexSpec, records)
  );
};

const generateIndexes = spec => {
  return [h(2, "Indexes")].concat(
    Object.keys(spec.indexes).reduce(
      (result, indexName) =>
        result.concat(
          generateIndex(3, spec, indexName, spec.indexes[indexName])
        ),
      []
    )
  );
};

const generateAST = spec => {
  const generatorComment = [
    u(
      "html",
      "<!-- Generated by solve-dynamo-spec.js. Update this documentation by updating the spec-v1.json file. -->"
    )
  ];

  const { service, description, version, author } = spec;

  const badge = u("image", {
    url: `https://img.shields.io/badge/version-${version}-orange.svg`,
    title: `Version ${version}`
  });

  const header = [
    u("heading", { depth: 1 }, [t(`${service} DynamoDB Spec  `), badge])
  ];

  const desc = [p(description)];

  const authorSection = [
    u("heading", { depth: 2 }, [t("Author")]),
    u("paragraph", [
      t(`Spec authored by ${author} and generated by `),
      u(
        "link",
        {
          url: "https://github.com/ericallam/dynamodb-spec-generator",
          title: "DynamoDB Spec Generator"
        },
        [t("dynamodb-spec-generator")]
      )
    ])
  ];

  const root = u(
    "root",
    generatorComment
      .concat(header)
      .concat(desc)
      .concat([h(2, "Table of Contents")])
      .concat(generateTableSpec(spec))
      .concat(generateAccessPatterns(spec))
      .concat(generateIndexes(spec).concat(authorSection))
  );

  const tableOfContents = toc(root, {
    heading: "Table of Contents",
    maxDepth: 3,
    tight: true
  });

  root.children.splice(tableOfContents.index, 0, tableOfContents.map);

  return root;
};

module.exports = {
  generateAST
};
