const rimraf = require("rimraf");
const fs = require("fs");
const { promisify } = require("util");

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);

const safeMkdir = async (path, options = {}) => {
  try {
    await access(path, fs.constants.F_OK | fs.constants.W_OK);
  } catch (error) {
    return mkdir(path, options);
  }
};

const safeRmdir = async path => {
  return new Promise((resolve, reject) => {
    rimraf(path, error => {
      if (error) {
        return reject(error);
      }

      return resolve();
    });
  });
};

module.exports = {
  safeMkdir,
  safeRmdir,
  writeFile
};
