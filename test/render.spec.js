const { renderMarkdown } = require("../src/render");

it("renders correcly", () => {
  const spec = {
    service: "Solve API",
    tableName: "solveless-api",
    description: "Documentation for the DynamoDB table",
    attributes: { pk: { type: "S" }, sk: { type: "S" } },
    indexes: { main: { partition: "pk", sort: "sk" } },
    accessPatterns: [
      {
        title: "Get user profile info",
        index: "main",
        type: "get",
        condition: {
          sort: { value: "metadata:user-6549" },
          partition: { value: "user-6549" }
        }
      },
      {
        title: "Get user available episodes",
        index: "main",
        type: "query",
        condition: {
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

it("renders sparse indexes correcly", () => {
  const spec = {
    service: "Solve API",
    tableName: "solveless-api",
    description: "Documentation for the DynamoDB table",
    attributes: { pk: { type: "S" }, sk: { type: "S" } },
    indexes: {
      main: { partition: "pk", sort: "sk" },
      gsi1: { partition: "status", sort: "sk" }
    },
    accessPatterns: [
      {
        title: "Get user profile info",
        index: "main",
        type: "get",
        condition: {
          sort: { value: "metadata:user-6549" },
          partition: { value: "user-6549" }
        }
      },
      {
        title: "Get user available episodes",
        index: "main",
        type: "query",
        condition: {
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
