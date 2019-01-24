const prettier = require("prettier");

const format = code => prettier.format(code, { parser: "babylon" });

const u = require("unist-builder");

const h = (depth, value) => u("heading", { depth }, [t(value)]);
const p = value => u("paragraph", [u("text", { value })]);
const t = value => u("text", { value });

const collapsibleSection = (summary, content) => {
  const frontMatter = [
    u("html", {
      value: "<details>"
    }),
    u("html", {
      value: `<summary>${summary}</summary>`
    })
  ];

  return frontMatter
    .concat(content)
    .concat([u("html", { value: "</details>" })]);
};

module.exports = {
  u,
  h,
  p,
  t,
  format,
  collapsibleSection
};
