'use strict';

const Promise = require('bluebird');
const Utils = require('./lib/utils');

module.exports = (functions, props) => {
  const utils = new Utils(functions, props);

  return new Promise((resolve) => {
    props.cloudFormation.buildCfTemplates();
    props.cloudFormation.uploadCfTemplates().then(() => {
      props.cloudFormation.deploy.update().then(() => {
        utils.cleanFunctions().then(() => {
          resolve();
        });
      });
    });
  });
};
