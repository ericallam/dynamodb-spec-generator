# dynamodb-spec-generator

A command line tool to generate documentation for a DynamoDB table and its access patterns.

## Purpose

Designing a DynamoDB table is very different than a SQL database because one must decide upfront what access patterns the table needs to support and pre-denormalize the data.

Additionally, a well-factored DynamoDB table, with overloading GSIs, sparse indexes, local secondary indexes, composite keys (etc.) can be quite hard to document and understand.

For example, the DynamoDB [Relational Modeling](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-modeling-nosql-B.html) docs include these two images to document a single table and its single GSI:

![Image of Relation Table Main Index](/assets/tabledesign.png)
![Image of Relation Table Secondary Index](/assets/tablegsi.png)

Did you notice above that there is actually a second GSI in there?

`dynamodb-spec-generator` was created to help alleviate this issue, to make it easier to design a DynamoDB according to the access patterns. All you have to do is provide it with a valid [DynamoDB spec](#dynamodb-spec) file and it will output a markdown document.

## Installation

`dynamodb-spec-generator` is packaged as an npm package and requires `node >= 8.0.0`:

```bash
# install the command globally
$ npm install dynamodb-spec-generator -g
```

Alternatively, if you are working inside a nodejs project, you can add it as a dependency:

```bash
# Install it as a development dependency
$ npm install dynamodb-spec-generator --save-dev
```

If you install it as a dependency, make sure to run it with `npx` like so:

```bash
$ npx dynamodb-spec-generator
```

## Usage

`dynamodb-spec-generator` takes a single argument, the path to the [spec file](#dynamodb-spec), and will output the markdown to `stdout`:

```bash
$ npx dynamodb-spec-generator spec.json
```

If you want to instead save it to a file, pass the `-o` flag:

```bash
$ npx dynamodb-spec-generator spec.json -o README.md
```

You can also have it watch for changes to the spec file and regenerate the markdown whenever you make a change by passing the `--watch` flag:

```bash
$ npx dynamodb-spec-generator spec.json -o README.md --watch
```

## Example

This example [spec file](#dynamodb-spec) attempts to recreate the table defined in the [Relational Modeling](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-modeling-nosql-B.html) docs.

```json
{
  "tableName": "HR-Table",
  "service": "HR Api Backend",
  "description": "A DynamoDB table design corresponds to the relational order entry schema that is shown in Relational Modeling",
  "attributes": {
    "PK": {
      "type": "S"
    },
    "SK": {
      "type": "S"
    },
    "Data": {
      "type": "S"
    }
  },
  "indexes": {
    "main": {
      "partition": "PK",
      "sort": "SK"
    },
    "gsi1": {
      "partition": "SK",
      "sort": "Data",
      "type": "global",
      "projection": "all"
    },
    "gsi2": {
      "partition": "GSI-Bucket",
      "sort": "Data",
      "type": "global",
      "projection": "all"
    }
  },
  "accessPatterns": [
    {
      "title": "Look up Employee Details by Employee ID",
      "type": "get",
      "index": "main",
      "params": {
        "partition": "HR-EMPLOYEE1",
        "sort": { "value": "EMPLOYEE1", "operator": "=" }
      }
    },
    {
      "title": "Query Employee Details by Employee Name",
      "type": "query",
      "index": "gsi1",
      "params": {
        "partition": { "value": "EMPLOYEE1" },
        "sort": { "value": "John", "operator": "begins_with" }
      }
    },
    {
      "title": "Get an employee's current job details only",
      "index": "main",
      "type": "query",
      "params": {
        "partition": { "value": "HR-EMPLOYEE1" },
        "sort": { "value": "v0", "operator": "begins_with" }
      }
    },
    {
      "title": "Get Open Orders for a customer for a date range",
      "type": "query",
      "index": "gsi1",
      "params": {
        "partition": { "value": "CUSTOMER1" },
        "sort": { "value": "OPEN#2019-01", "operator": "begins_with" }
      }
    },
    {
      "title": "Show all Orders in OPEN status for a date range across all customers",
      "description": "Query in parallel for the range [0..N] to get all shards",
      "type": "query",
      "index": "gsi2",
      "params": {
        "partition": "Bucket-6",
        "sort": {
          "operator": "between",
          "minValue": "OPEN#2019-01",
          "maxValue": "OPEN#2019-02"
        }
      }
    },
    {
      "title": "All Employees Hired Recently",
      "index": "gsi1",
      "type": "query",
      "params": {
        "partition": "HR-CONFIDENTIAL",
        "sort": { "value": "2019-01-01", "operator": ">" }
      }
    },
    {
      "title": "Find all employees in a certain warehouse",
      "index": "gsi1",
      "type": "query",
      "params": {
        "partition": "WAREHOUSE1"
      }
    },
    {
      "title": "Get all OrderItems for a Product including warehouse location inventories",
      "type": "query",
      "index": "gsi1",
      "params": {
        "partition": "PRODUCT1",
        "filters": [
          {
            "attribute": "Warehouse1",
            "operator": "attribute_exists"
          }
        ]
      }
    },
    {
      "title": "Get customers by Account Rep",
      "type": "query",
      "index": "gsi1",
      "params": {
        "partition": "EMPLOYEE1",
        "filters": [
          {
            "attribute": "Address",
            "operator": "attribute_exists"
          }
        ]
      }
    },
    {
      "title": "Get orders by Account Rep and date",
      "description": "Scatter/Gather to query all statuses (OPEN, PENDING, FULFILLED)",
      "type": "query",
      "index": "gsi1",
      "params": {
        "partition": "EMPLOYEE1",
        "sort": { "value": "OPEN#2019-01-12", "operator": "=" }
      }
    },
    {
      "title": "Get all employees with specific Job Title",
      "type": "query",
      "index": "gsi1",
      "params": {
        "partition": "v0"
      }
    },
    {
      "title": "Get inventory by Product and Warehouse",
      "type": "get",
      "index": "main",
      "params": {
        "partition": "OE-PRODUCT1",
        "sort": { "value": "PRODUCT1", "operator": "=" }
      }
    },
    {
      "title": "Get total product inventory",
      "type": "get",
      "index": "main",
      "params": {
        "partition": "OE-PRODUCT1",
        "sort": {
          "value": "PRODUCT1",
          "operator": "="
        }
      }
    },
    {
      "title": "Get Account Reps ranked by Order Total and Sales Period",
      "type": "query",
      "index": "gsi1",
      "params": {
        "partition": "2018-Q4",
        "order": "DESC"
      }
    }
  ],
  "records": [
    {
      "PK": "HR-EMPLOYEE1",
      "SK": "EMPLOYEE1",
      "Data": "John Smith",
      "StartDate": "01-12-2019"
    },
    { "PK": "HR-EMPLOYEE1", "SK": "v0", "Data": "Principle Account Manager" },
    {
      "PK": "HR-EMPLOYEE1",
      "SK": "HR-CONFIDENTIAL",
      "Data": "2019-02-12",
      "Employee": "John Smith",
      "Salary": 50000
    },
    {
      "PK": "HR-EMPLOYEE1",
      "SK": "WAREHOUSE1",
      "Data": "2019-02-15",
      "Employee Name": "John Smith"
    },
    {
      "PK": "HR-EMPLOYEE1",
      "SK": "2018-Q4",
      "Data": "5000",
      "Employee Name": "John Smith"
    },
    {
      "PK": "HR-EMPLOYEE2",
      "SK": "2018-Q4",
      "Data": "10000",
      "Employee Name": "John Smith"
    },
    {
      "PK": "OE-ORDER1",
      "SK": "CUSTOMER1",
      "Data": "OPEN#2019-01-18",
      "GSI-Bucket": "Bucket-6"
    },
    {
      "PK": "OE-ORDER1",
      "SK": "PRODUCT1",
      "Data": "OPEN#2019-01-18",
      "GSI-Bucket": "Bucket-4",
      "UnitPrice": "$89.99"
    },
    {
      "PK": "OE-ORDER1",
      "SK": "EMPLOYEE1",
      "Data": "OPEN#2019-01-12",
      "OrderTotal": 2500
    },
    {
      "PK": "OE-PRODUCT1",
      "SK": "PRODUCT1",
      "Data": "Quickcrete Cement - 50lb bag",
      "Warehouse1": 46,
      "Warehouse2": 12
    },
    {
      "PK": "OE-CUSTOMER1",
      "SK": "CUSTOMER1",
      "Data": "Ace Building Supplies",
      "Address": "1600 Penn"
    },
    {
      "PK": "OE-CUSTOMER1",
      "SK": "EMPLOYEE1",
      "Data": "Ace Building Supplies",
      "Address": "1600 Penn"
    }
  ]
}
```

Will generate [this markdown](/examples/relationalModeling.md)

## DynamoDB Spec

## TODO

- Link to the Indexes in the Access Pattern descriptions
- Query projection
- Query attributes to get
- Consistent reads
- Shards
- Scatter/Gather access patterns
- Local Secondary Indexes
- TTL attribute
