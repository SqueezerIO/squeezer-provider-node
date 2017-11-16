'use strict';

const Promise = require('bluebird');
const Archiver = require('../../../../utils/archiver');
const FunctionsUtils = require('../../../../utils/functions');

module.exports = (functions, props) => {
  const archiver = new Archiver();
  const functionsUtils = new FunctionsUtils(functions);
  const packageFunctions = functionsUtils.getDeployFunctions();

  return new Promise((resolve) => {
    archiver.packageFunctions(packageFunctions, props).then(() => {
      resolve();
    });
  });
};
