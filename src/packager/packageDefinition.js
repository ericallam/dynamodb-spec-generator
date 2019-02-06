const generatePackageJSON = (packageName, spec) => {
  const definition = {
    name: packageName,
    version: spec.version || "0.0.1",
    description: spec.description,
    main: "dist/index.js",
    types: "dist/index.d.ts",
    repository: `https://github.com/${packageName.replace("@", "")}`,
    author: spec.author,
    license: "MIT",
    scripts: {
      build: "yarn run build-ts",
      "build-ts": "./node_modules/.bin/tsc",
      "watch-ts": "./node_modules/.bin/tsc -w",
      prepublishOnly: "yarn run build-ts"
    },
    files: ["dist/**/*"],
    devDependencies: {
      "aws-sdk": "^2.395.0",
      typescript: "^3.2.4",
      "ts-node": "^8.0.2",
      "@types/node": "^10.12.18"
    },
    peerDependencies: {
      "@solve-hq/solve-powertools": "1.x"
    }
  };

  return JSON.stringify(definition, null, 2);
};

module.exports = {
  generatePackageJSON
};
