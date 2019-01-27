const { renderMarkdown } = require("../src/render");

it("renders correcly", () => {
  const spec = {
    service: "Solve API",
    description: "Documentation for the DynamoDB table",
    tableDefinition: {
      TableName: "solveless-api",
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" }
      ],
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      BillingMode: "PAY_PER_REQUEST"
    },
    accessPatterns: [
      {
        title: "Get user profile info",
        index: "main",
        type: "get",
        params: {
          sort: "metadata:user-6549",
          partition: "user-6549"
        }
      },
      {
        title: "Get user available episodes",
        index: "main",
        type: "query",
        params: {
          partition: { value: "user-6549" },
          order: "DESC",
          filters: [
            { attribute: "releaseDate", operator: "<=", value: "01-12-2019" },
            {
              attribute: "status",
              operator: "in",
              value: ["READY", "PUBLISHED"]
            },
            {
              attribute: "title",
              operator: "size",
              sizeOperator: ">=",
              value: 3
            }
          ]
        }
      }
    ],
    records: [
      {
        pk: "user-6549",
        sk: "metadata:user-6549",
        currentPoints: 87,
        winCount: 54,
        playedCount: 65,
        profile: {
          avatar: "https://user-6549-avatar.png",
          username: "foofighter1987"
        }
      },
      {
        pk: "user-6549",
        sk: "available:50",
        releaseDate: "01-01-2019",
        status: "READY",
        title: "The Mafia Problem"
      },
      {
        pk: "user-6549",
        sk: "available:300",
        releaseDate: "01-01-2019",
        status: "READY",
        title: "The Family Problem"
      }
    ]
  };

  const markdown = renderMarkdown(spec);

  expect(markdown).toMatchSnapshot();
});

it("renders sparse indexes correcly", () => {
  const spec = {
    service: "Solve API",
    description: "Documentation for the DynamoDB table",
    tableDefinition: {
      TableName: "solveless-api",
      AttributeDefinitions: [
        { AttributeName: "pk", AttributeType: "S" },
        { AttributeName: "sk", AttributeType: "S" }
      ],
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "gsi1",
          KeySchema: [
            { AttributeName: "status", KeyType: "HASH" },
            { AttributeName: "sk", KeyType: "RANGE" }
          ]
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      },
      BillingMode: "PAY_PER_REQUEST"
    },
    accessPatterns: [
      {
        title: "Get user profile info",
        index: "main",
        type: "get",
        params: {
          sort: { value: "metadata:user-6549" },
          partition: { value: "user-6549" }
        }
      },
      {
        title: "Get user available episodes",
        index: "main",
        type: "query",
        params: {
          sort: { value: "episode:available", operator: "=" },
          partition: { value: "user-6549" },
          filters: [
            { attribute: "releaseDate", operator: "<=", value: "01-12-2019" },
            {
              attribute: "status",
              operator: "in",
              value: ["READY", "PUBLISHED"]
            },
            {
              attribute: "title",
              operator: "size",
              sizeOperator: ">=",
              value: 3
            }
          ],
          limit: 10
        }
      }
    ],
    records: [
      {
        pk: "user-6549",
        sk: "metadata:user-6549",
        currentPoints: 87,
        winCount: 54,
        playedCount: 65,
        profile: {
          avatar: "https://user-6549-avatar.png",
          username: "foofighter1987"
        }
      },
      {
        pk: "user-6549",
        sk: "episode:available",
        releaseDate: "01-01-2019",
        status: "READY",
        title: "The Mafia Problem"
      }
    ]
  };

  const markdown = renderMarkdown(spec);

  expect(markdown).toMatchSnapshot();
});
