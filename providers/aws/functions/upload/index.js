'use strict';

const Promise = require('bluebird');
const FunctionsUtils = require('../../../../utils/functions');
const path = require('path');

module.exports = (functions, props) => {
  const functionsUtils = new FunctionsUtils(functions);
  const uploadFunctions = functionsUtils.getDeployFunctions();

  return new Promise((resolve) => {
    Promise.each(uploadFunctions, (functionObject) => {
      const localPath = path.join(functionObject.packagePath, functionObject.packageFile);
      const remotePath = props.utils.s3FunctionKey(functionObject);

      return props.storage.uploadFile(localPath, remotePath);
    }).then(() => {
      resolve();
    });
  });
};
