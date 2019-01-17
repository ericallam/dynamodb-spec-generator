const unified = require("unified");
const stringify = require("remark-stringify");
const { generateAST } = require("./generate");

const renderMarkdown = spec => {
  const ast = generateAST(spec);

  return unified()
    .use(stringify)
    .stringify(ast);
};

module.exports = { renderMarkdown };
