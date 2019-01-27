const { validateSpec } = require("../src/validate");

test("valid specs", () => {
  const validSpec = spec => {
    const errors = validateSpec(spec);
    expect(errors).toBe(null);
  };

  [
    {
      service: "Solve",
      tableDefinition: {
        TableName: "solve",
        KeySchema: [
          { AttributeName: "pk", KeyType: "HASH" },
          { AttributeName: "sk", KeyType: "RANGE" }
        ],
        AttributeDefinitions: [
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        BillingMode: "PAY_PER_REQUEST",
        GlobalSecondaryIndexes: [
          {
            IndexName: "gsi1",
            KeySchema: [
              { AttributeName: "SK", KeyType: "HASH" },
              { AttributeName: "Data", KeyType: "RANGE" }
            ],
            Projection: { ProjectionType: "ALL" },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          },
          {
            IndexName: "gsi2",
            KeySchema: [
              { AttributeName: "GSI-Bucket", KeyType: "HASH" },
              { AttributeName: "Data", KeyType: "RANGE" }
            ],
            Projection: { ProjectionType: "ALL" },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ]
      },
      accessPatterns: [
        {
          title: "Example",
          description: "Useful for an example description",
          index: "main",
          type: "query",
          params: {
            partition: "user-1",
            order: "DESC",
            sort: { value: "1000", operator: "=" }
          }
        }
      ],
      records: [{ pk: "user-1", sk: "1000" }, { pk: "user-1", sk: "10000" }]
    },
    {
      service: "Solve",
      tableDefinition: {
        TableName: "solve",
        KeySchema: [
          { AttributeName: "pk", KeyType: "HASH" },
          { AttributeName: "sk", KeyType: "RANGE" }
        ],
        AttributeDefinitions: [
          { AttributeName: "pk", AttributeType: "S" },
          { AttributeName: "sk", AttributeType: "S" }
        ],
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        BillingMode: "PAY_PER_REQUEST",
        GlobalSecondaryIndexes: [
          {
            IndexName: "gsi1",
            KeySchema: [
              { AttributeName: "SK", KeyType: "HASH" },
              { AttributeName: "Data", KeyType: "RANGE" }
            ],
            Projection: { ProjectionType: "ALL" },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          },
          {
            IndexName: "gsi2",
            KeySchema: [
              { AttributeName: "GSI-Bucket", KeyType: "HASH" },
              { AttributeName: "Data", KeyType: "RANGE" }
            ],
            Projection: { ProjectionType: "ALL" },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5
            }
          }
        ]
      },
      accessPatterns: [
        {
          title: "Example",
          description: "Useful for an example description",
          index: "main",
          type: "query",
          params: {
            partition: "user-1",
            order: "DESC",
            sort: "1000"
          }
        }
      ],
      records: [{ pk: "user-1", sk: "1000" }, { pk: "user-1", sk: "10000" }]
    }
  ].forEach(t => validSpec(t));
});
