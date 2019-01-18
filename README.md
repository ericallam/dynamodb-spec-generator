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

```

## DynamoDB Spec

## TODO

- Query projection
- Query attributes to get
- Consistent reads
- Query Scan Backward
- Shards
- Scatter/Gather access patterns
- Local Secondary Indexes
- TTL attribute
