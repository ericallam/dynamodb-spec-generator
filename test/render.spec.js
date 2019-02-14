const { renderMarkdown } = require("../src/render");
const { preprocessSpec } = require("../src/preprocessSpec");

it("renders correcly", () => {
  const spec = {
    service: "Solve API",
    description: "Documentation for the DynamoDB table",
    packageName: "@solve-hq/db",
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
        },
        name: "getUserProfileInfo",
        attributeMap: {
          partition: "id",
          sort: "info"
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

  const markdown = renderMarkdown(preprocessSpec(spec));

  expect(markdown).toMatchSnapshot();
});

it("renders this spec correctly", () => {
  const spec = {
    service: "Solveless API",
    version: "0.1.0",
    author: "Eric Allam",
    description: "The table design for the Solveless API service",
    tableDefinition: {
      AttributeDefinitions: [
        {
          AttributeName: "pk",
          AttributeType: "S"
        },
        {
          AttributeName: "sk",
          AttributeType: "S"
        },
        {
          AttributeName: "subscriptionId",
          AttributeType: "S"
        },
        {
          AttributeName: "data",
          AttributeType: "S"
        },
        {
          AttributeName: "catalogueId",
          AttributeType: "S"
        }
      ],
      TableName: "solveless-api",
      KeySchema: [
        {
          AttributeName: "pk",
          KeyType: "HASH"
        },
        {
          AttributeName: "sk",
          KeyType: "RANGE"
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      },
      GlobalSecondaryIndexes: [
        {
          KeySchema: [
            {
              AttributeName: "subscriptionId",
              KeyType: "HASH"
            },
            {
              AttributeName: "data",
              KeyType: "RANGE"
            }
          ],
          IndexName: "SubscriptionLookup",
          Projection: {
            ProjectionType: "ALL"
          }
        },
        {
          KeySchema: [
            {
              AttributeName: "catalogueId",
              KeyType: "HASH"
            },
            {
              AttributeName: "data",
              KeyType: "RANGE"
            }
          ],
          IndexName: "CatalogueLookup",
          Projection: {
            ProjectionType: "ALL"
          }
        }
      ]
    },
    accessPatterns: [
      {
        title:
          "Get all content ordered by list position for a specific catalogue",
        index: "CatalogueLookup",
        type: "query",
        params: {
          partition: { value: "catalogue-a" },
          order: "DESC"
        }
      }
    ],
    records: [
      {
        pk: "episode-54",
        sk: "metadata:episode",
        contentType: "episode",
        title: "Who's the target?"
      },
      {
        pk: "episode-54",
        sk: "metadata:catalogue-b",
        catalogueId: "catalogue-b",
        data: "32:2019-02-12T12:00:00Z",
        contentType: "episode"
      },
      {
        pk: "episode-54",
        sk: "metadata:catalogue-a",
        catalogueId: "catalogue-a",
        data: "12:2019-02-12T12:00:00Z",
        contentType: "episode"
      },
      {
        pk: "series-54",
        sk: "metadata:catalogue-a",
        catalogue: "catalogue-a",
        data: "55:2019-02-10T12:00:00Z",
        contentType: "series"
      },
      {
        pk: "user-8790",
        sk: "episode:completed:2019-01-22T10:28:49.930Z",
        episodeId: "episode-55"
      },
      {
        pk: "user-8790",
        sk: "episode:completed:2019-01-22T11:15:00.000Z",
        episodeId: "episode-102"
      },
      {
        pk: "user-8790",
        sk: "completed-episodes",
        ids: ["episode-102", "episode-55"]
      },
      {
        pk: "user-8790",
        sk: "metadata",
        catalogueId: "catalogue-a",
        completed: 55,
        correctGuesses: 24,
        liveCompleted: 4
      },
      {
        pk: "user-8790",
        sk: "sub:Production:sub-9091",
        subscriptionId: "sub-9091",
        expiresDate: "2019-02-24",
        data: "user:user-8790",
        subscriptionStatus: "subscribed"
      }
    ]
  };

  const markdown = renderMarkdown(preprocessSpec(spec));

  expect(markdown).toMatchSnapshot();
});

it("renders correctly when a sparse index has no records", () => {
  const spec = {
    service: "Solve API",
    description: "Documentation for the DynamoDB table",
    packageName: "@solve-hq/db",
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
          IndexName: "gsi2",
          KeySchema: [
            { AttributeName: "order", KeyType: "HASH" },
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
        title: "Get all user partition items",
        index: "main",
        type: "query",
        params: {
          partition: { value: "user-6549" }
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

  const markdown = renderMarkdown(preprocessSpec(spec));

  expect(markdown).toMatchSnapshot();
});

it("renders query access patterns using only a partion key correclty", () => {
  const spec = {
    service: "Solve API",
    description: "Documentation for the DynamoDB table",
    packageName: "@solve-hq/db",
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
        title: "Get all user partition items",
        index: "main",
        type: "query",
        params: {
          partition: { value: "user-6549" }
        }
      },
      {
        title: "Get all ready episodes",
        index: "gsi1",
        type: "query",
        params: {
          partition: { value: "READY" }
        }
      },
      {
        title: "Get all stopped episodes",
        index: "gsi1",
        type: "query",
        params: {
          partition: { value: "STOPPED" }
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

  const markdown = renderMarkdown(preprocessSpec(spec));

  expect(markdown).toMatchSnapshot();
});

it("renders sparse indexes correcly", () => {
  const spec = {
    service: "Solve API",
    description: "Documentation for the DynamoDB table",
    packageName: "@solve-hq/db",
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

  const markdown = renderMarkdown(preprocessSpec(spec));

  expect(markdown).toMatchSnapshot();
});
