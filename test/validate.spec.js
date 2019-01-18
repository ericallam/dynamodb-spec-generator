const { validateSpec } = require("../src/validate");

test("valid specs", () => {
  const validSpec = spec => {
    const errors = validateSpec(spec);
    expect(errors).toBe(null);
  };

  [
    {
      service: "Solve",
      tableName: "solve",
      attributes: { pk: { type: "S" }, sk: { type: "S" } },
      indexes: { main: { partition: "pk", sort: "sk" } },
      accessPatterns: [
        {
          title: "Example",
          description: "Useful for an example description",
          index: "main",
          type: "query",
          params: { partition: "user-1", order: "DESC" }
        }
      ],
      records: [{ pk: "user-1", sk: "1000" }, { pk: "user-1", sk: "10000" }]
    },
    {
      service: "Solve",
      tableName: "solve",
      attributes: { pk: { type: "S" }, sk: { type: "S" } },
      indexes: { main: { partition: "pk", sort: "sk" } },
      accessPatterns: [
        {
          title: "Example",
          description: "Useful for an example description",
          params: { partition: "user-1" }
        }
      ]
    },
    {
      service: "Solve",
      tableName: "solve",
      attributes: { pk: { type: "S" }, sk: { type: "S" } },
      indexes: { main: { partition: "pk", sort: "sk" } },
      accessPatterns: [
        {
          title: "Example",
          description: "Useful for an example description",
          params: { partition: { value: "user-1" } }
        }
      ]
    },
    {
      service: "Solve",
      tableName: "solve",
      attributes: { pk: { type: "S" } },
      indexes: {
        main: { partition: "pk", sort: "sk" },
        gsi1: { partition: "sk", sort: "pk", type: "global" }
      },
      accessPatterns: [
        {
          title: "Example",
          index: "main",
          type: "query",
          params: {
            partition: { value: "user" },
            sort: { operator: "begins_with", value: "AVAILABLE" }
          }
        }
      ]
    },
    {
      service: "Solve",
      tableName: "solve",
      attributes: { pk: { type: "S" } },
      indexes: {
        main: { partition: "pk", sort: "sk" },
        gsi1: { partition: "sk", sort: "pk", type: "global" }
      },
      accessPatterns: [
        {
          title: "Example",
          index: "main",
          type: "query",
          params: {
            partition: { value: "user" },
            sort: { operator: "between", minValue: 0, maxValue: 50 }
          }
        }
      ]
    },
    {
      service: "Solve",
      tableName: "solve",
      attributes: { pk: { type: "S" } },
      indexes: {
        main: { partition: "pk", sort: "sk" },
        gsi1: { partition: "sk", sort: "pk", type: "global" }
      },
      accessPatterns: [
        {
          title: "Example",
          index: "main",
          type: "query",
          params: {
            partition: { value: "user" },
            sort: { operator: "between", minValue: 0, maxValue: 50 },
            filters: [
              {
                attribute: "availabilityDate",
                operator: "<=",
                value: "01-16-2019"
              },
              { attribute: "deletedDate", operator: "attribute_not_exists" }
            ]
          }
        }
      ]
    },
    {
      service: "Solve",
      tableName: "solve",
      attributes: { pk: { type: "S" } },
      indexes: {
        main: { partition: "pk", sort: "sk" },
        gsi1: { partition: "sk", sort: "pk", type: "global" }
      },
      accessPatterns: [
        {
          title: "Example",
          index: "main",
          type: "query",
          params: {
            partition: { value: "user" },
            sort: { operator: "between", minValue: 0, maxValue: 50 },
            filters: [
              {
                attribute: "availabilityDate",
                operator: "<=",
                value: "01-16-2019"
              },
              { attribute: "deletedDate", operator: "attribute_not_exists" }
            ]
          }
        }
      ],
      records: [{ pk: "1234", sk: "6789" }]
    }
  ].forEach(t => validSpec(t));
});

test("accessPattern index name matching a listed index", () => {
  const spec = {
    service: "Solve",
    tableName: "solve",
    attributes: { pk: { type: "S" } },
    indexes: {
      main: { partition: "pk", sort: "sk" },
      gsi1: { partition: "sk", sort: "pk", type: "global" }
    },
    accessPatterns: [
      {
        title: "Example",
        index: "foo"
      }
    ]
  };

  const errors = validateSpec(spec);
  expect(errors).toContain(
    ".accessPatterns[0].index should be equal to one of the allowed values: main, gsi1"
  );
});
