const Ajv = require("ajv");
const ajvKeywords = require("ajv-keywords");
const fs = require("fs");
const path = require("path");
const _ = require("lodash");

const ajv = new Ajv({
  v5: true,
  coerceTypes: "array", // important for query string params
  allErrors: true,
  useDefaults: true,
  $data: true, // required for ajv-keywords
  defaultLanguage: "en"
});

ajvKeywords(ajv);

let validator;

const validateSpec = spec => {
  if (!validator) {
    const schemaPath = path.join(__dirname, "schema.json");
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

    validator = ajv.compile(schema);
  }

  const metafiedSpec = metafySpec(spec);

  const valid = validator(metafiedSpec);

  if (valid) {
    return null;
  }

  return createValidationErrors(validator.errors);
};

const metafySpec = spec => {
  const result = { ...spec, _meta: {} };

  if (_.isPlainObject(spec.indexes)) {
    result._meta.indexes = Object.keys(spec.indexes);

    if (spec.indexes.main) {
      result._meta.primaryKeys = _.compact([
        spec.indexes.main.partition,
        spec.indexes.main.sort
      ]);
    }
  }

  return result;
};

const defaultErrorBuilder = error => {
  if (error.dataPath) {
    return `${error.dataPath} ${error.message}`;
  } else {
    return error.message;
  }
};

const keywordMessageBuilders = {
  enum: error => {
    return `${defaultErrorBuilder(error)}: ${_.join(
      error.params.allowedValues,
      ", "
    )}`;
  },
  additionalProperties: error => {
    return `${defaultErrorBuilder(error)}: ${_.join(_.values(error.params))}`;
  }
};

const createValidationErrors = errors => {
  if (!errors) {
    return null;
  }

  return errors.map(error => {
    const messageBuilder =
      keywordMessageBuilders[error.keyword] || defaultErrorBuilder;

    return messageBuilder(error);
  });
};

module.exports = { validateSpec };
