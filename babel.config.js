const fs = require("fs");
const nodeVersion = fs.readFileSync("./.nvmrc").toString().split(".");
const nodeMajor = nodeVersion[0];
const nodeMinor = nodeVersion[1];

module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: `${nodeMajor}.${nodeMinor}`}}],
    '@babel/preset-typescript',
  ],
};
