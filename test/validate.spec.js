const { validateSpec } = require("../src/validate");

test("validation errors", () => {
  const validationError = (spec, message) => {
    const errors = validateSpec(spec);
    expect(errors).toContain(message);
  };

  [
    [{}, "should have required property 'service'"],
    [
      { service: "Solve", tableName: "a" },
      ".tableName should NOT be shorter than 3 characters"
    ],
    [
      { service: "Solve", tableName: "aaa&&&" },
      '.tableName should match pattern "^[a-zA-Z0-9._-]*$"'
    ],
    [
      {
        service: "Solve",
        tableName: "solve",
        attributes: { pk: { type: "NN" } }
      },
      ".attributes['pk'].type should be equal to one of the allowed values: S, N, B"
    ],
    [
      {
        service: "Solve",
        tableName: "solve",
        attributes: { pk: { type: "S" } },
        indexes: { main: {} }
      },
      ".indexes.main should have required property 'partition'"
    ],
    [
      {
        service: "Solve",
        tableName: "solve",
        attributes: { pk: { type: "S" } },
        indexes: { main: { partition: "++++" } }
      },
      '.indexes.main.partition should match pattern "^[A-Za-z0-9_.-]+$"'
    ],
    [
      {
        service: "Solve",
        tableName: "solve",
        attributes: { pk: { type: "S" } },
        indexes: { main: { partition: "pk", sort: "sk" }, gsi1: {} }
      },
      ".indexes['gsi1'] should have required property 'partition'"
    ],
    [
      {
        service: "Solve",
        tableName: "solve",
        attributes: { pk: { type: "S" } },
        indexes: {
          main: { partition: "pk", sort: "sk" },
          gsi1: { partition: "sk" }
        }
      },
      ".indexes['gsi1'] should have required property 'sort'"
    ],
    [
      {
        service: "Solve",
        tableName: "solve",
        attributes: { pk: { type: "S" } },
        indexes: {
          main: { partition: "pk", sort: "sk" },
          gsi1: { partition: "sk", sort: [] }
        }
      },
      ".indexes['gsi1'].sort should be string"
    ],
    [
      {
        service: "Solve",
        tableName: "solve",
        attributes: { pk: { type: "S" } },
        indexes: {
          main: { partition: "pk", sort: "sk" },
          gsi1: { partition: "sk", sort: "pk", type: "banana" }
        }
      },
      ".indexes['gsi1'].type should be equal to one of the allowed values: global, local"
    ],
    [
      {
        service: "Solve",
        tableName: "solve",
        attributes: { pk: { type: "S" } },
        indexes: {
          main: { partition: "pk", sort: "sk" },
          gsi1: { partition: "sk", sort: "pk", type: "global" }
        },
        accessPatterns: [{ title: "Example", index: "main", type: "foo" }]
      },
      ".accessPatterns[0].type should be equal to one of the allowed values: query, get"
    ],
    [
      {
        service: "Solve",
        tableName: "solve",
        attributes: { pk: { type: "S" } },
        indexes: {
          main: { partition: "pk", sort: "sk" },
          gsi1: { partition: "sk", sort: "pk", type: "global" }
        },
        accessPatterns: [{ title: "Example", index: "main", type: "query" }]
      },
      ".accessPatterns[0] should have required property 'condition'"
    ],
    [
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
            condition: { partition: {} }
          }
        ]
      },
      ".accessPatterns[0].condition.partition should have required property 'value'"
    ],
    [
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
            condition: { partition: { value: "user-1111" }, sort: {} }
          }
        ]
      },
      ".accessPatterns[0].condition.sort should have required property 'operator'"
    ],
    [
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
            condition: {
              partition: { value: "user-1111" },
              sort: { operator: "begins_with" }
            }
          }
        ]
      },
      ".accessPatterns[0].condition.sort should have required property 'value'"
    ],
    [
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
            condition: {
              partition: { value: "user-1111" },
              sort: { operator: "begins_with" }
            }
          }
        ]
      },
      ".accessPatterns[0].condition.sort should have required property 'value'"
    ],
    [
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
            condition: {
              partition: { value: "user-1111" },
              sort: { operator: "begins_with", value: "asdkajsd" }
            }
          }
        ],
        records: [{ foo: "bar" }]
      },
      ".records[0] should have required property 'pk'"
    ],
    [
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
            condition: {
              partition: { value: "user-1111" },
              sort: { operator: "begins_with", value: [] }
            }
          }
        ]
      },
      ".accessPatterns[0].condition.sort should match exactly one schema in oneOf"
    ]
  ].forEach(t => validationError(t[0], t[1]));
});

test("valid specs", () => {
  const validSpec = spec => {
    const errors = validateSpec(spec);
    expect(errors).toBeNull;
  };

  [
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
          condition: {
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
          condition: {
            partition: { value: "user" },
            sort: { operator: "between", lowerValue: 0, upperValue: 50 }
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
          condition: {
            partition: { value: "user" },
            sort: { operator: "between", lowerValue: 0, upperValue: 50 },
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
          condition: {
            partition: { value: "user" },
            sort: { operator: "between", lowerValue: 0, upperValue: 50 },
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
      records: [
        {
          pk: "1234",
          sk: "6789"
        }
      ]
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
