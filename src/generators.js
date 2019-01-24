const _ = require("lodash");
const toc = require("mdast-util-toc");

const { u, h, p, t, format, collapsibleSection } = require("./helpers");
const {
  getAllRecordsInIndex,
  getAllRecordsMatchingAccessPattern,
  getIndexPartitionKey,
  getIndexSortKey,
  getParamsKeyPartValue
} = require("./spec");

const dynamodb = require("./dynamodb");

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
      value: `$ aws dynamodb create-table --table-name ${getTableName(
        spec
      )} --cli-input-json create-table.json`
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
  const tableSpec = getTableDefinition(spec);

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

const generateQueryConditionCode = (operator, sk) => {
  const defaultOperatorGenerator = () => `#${sk} ${operator} :${sk}`;

  const operators = {
    begins_with: () => `begins_with(#${sk}, :${sk})`,
    between: () => `#${sk} BETWEEN :${sk}Min AND :${sk}Max`
  };

  return (operators[_.toLower(operator)] || defaultOperatorGenerator)();
};

const generateSortKeyConditionCode = (spec, accessPattern) => {
  const sortKey = getIndexSortKey(spec, accessPattern.index);

  return u("inlineCode", {
    value: generateQueryConditionCode(
      accessPattern.params.sort.operator,
      sortKey
    )
  });
};

const findAllRecordsMatchingAccessPattern = (spec, accessPattern) => {
  if (accessPattern.type === "query") {
    return dynamodb.query(spec, accessPattern);
  }

  return _.compact([dynamodb.get(spec, accessPattern)]);
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

const generateKeyConditionExpression = (spec, accessPattern) => {
  const pk = getIndexPartitionKey(spec, accessPattern.index);
  const sk = getIndexSortKey(spec, accessPattern.index);

  if (!accessPattern.params.sort) {
    return `#${pk} = :${pk}`;
  }

  return `#${pk} = :${pk} and ${generateQueryConditionCode(
    accessPattern.params.sort.operator,
    sk
  )}`;
};

const generateExpressionAttributeValues = (spec, accessPattern) => {
  const pk = getIndexPartitionKey(spec, accessPattern.index);
  const sk = getIndexSortKey(spec, accessPattern.index);

  const result = {
    [`:${pk}`]: getParamsKeyPartValue(accessPattern.params, "partition")
  };

  if (accessPattern.params.sort) {
    if (_.toLower(accessPattern.params.sort.operator) === "between") {
      Object.assign(result, {
        [`:${sk}Min`]: accessPattern.params.sort.minValue,
        [`:${sk}Max`]: accessPattern.params.sort.maxValue
      });
    } else {
      Object.assign(result, {
        [`:${sk}`]: getParamsKeyPartValue(accessPattern.params, "sort")
      });
    }
  }

  return result;
};

const generateExpressionAttributeNames = (spec, accessPattern) => {
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
    TableName: getTableName(spec),
    KeyConditionExpression: generateKeyConditionExpression(spec, accessPattern),
    ExpressionAttributeNames: generateExpressionAttributeNames(
      spec,
      accessPattern
    ),
    ExpressionAttributeValues: generateExpressionAttributeValues(
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

  return introProse.concat(params).concat(recordsSection);
};

const generateAccessPatternRecordsSection = (spec, accessPattern, depth) => {
  const indexSpec = getIndexSpec(spec, accessPattern.index);

  let recordsSection;

  const matchingRecords = findAllRecordsMatchingAccessPattern(
    spec,
    accessPattern
  );

  if (matchingRecords.length) {
    recordsSection = [h(depth + 1, "Matching Records")].concat(
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
          TableName: getTableName(spec),
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

  return introProse.concat(params).concat(records);
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

const generateTableHeader = indexSpec => {
  const partition = getIndexPartitionAttributeName(indexSpec);
  const sort = getIndexSortAttributeName(indexSpec);

  return [
    u(
      "tableRow",
      _.compact([
        u("tableCell", [t(`${partition} (HASH)`)]),
        sort ? u("tableCell", [t(`${sort} (RANGE)`)]) : null
      ])
    )
  ];
};

const generateTableRecordPrimaryKeyCells = (indexSpec, record) => {
  const partition = getIndexPartitionAttributeName(indexSpec);
  const sort = getIndexSortAttributeName(indexSpec);

  const result = [];

  result.push(u("tableCell", [t(record[partition])]));

  if (sort) {
    result.push(u("tableCell", [t(record[sort])]));
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

const generateTableRecordAttributeCells = (indexSpec, record) => {
  const partition = getIndexPartitionAttributeName(indexSpec);
  const sort = getIndexSortAttributeName(indexSpec);

  const primaryKeyAttributes = _.compact([partition, sort]);

  return Object.keys(_.omit(record, primaryKeyAttributes)).map(key => {
    return u("tableCell", generateTableRecordValue(key, record[key]));
  });
};

const generateTableRecord = (indexSpec, record) => {
  return u(
    "tableRow",
    generateTableRecordPrimaryKeyCells(indexSpec, record).concat(
      generateTableRecordAttributeCells(indexSpec, record)
    )
  );
};

const generateTableRecords = (indexSpec, records) => {
  return records.map(record => generateTableRecord(indexSpec, record));
};

const generateTable = (indexSpec, records) => {
  return [
    u(
      "table",
      generateTableHeader(indexSpec).concat(
        generateTableRecords(indexSpec, records)
      )
    )
  ];
};

const generateIndex = (depth, spec, indexSpec) => {
  const records = getAllRecordsInIndex(spec.records, indexSpec);

  return [h(depth, _.upperFirst(getIndexName(indexSpec)))].concat(
    generateTable(indexSpec, records)
  );
};

const generateIndexes = spec => {
  const indexes = getIndexes(spec);

  return [h(2, "Indexes")].concat(
    indexes.reduce(
      (result, indexSpec) => result.concat(generateIndex(3, spec, indexSpec)),
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
  generateAST: generateAST
};
