'use strict';

const Promise = require('bluebird');

class Utils {
  constructor(props) {
    this.props = props;
  }

  lambdaLogicalId(functionIdentifier) {
    return `${this.props.vars.identifier}${functionIdentifier}Function`;
  }

  s3FunctionKey(functionObject) {
    const functionIdentifier = functionObject.identifier;
    const checksum = functionObject.checksum;

    return `functions/${functionIdentifier}/${checksum}.zip`;
  }

  getAppBaseUrl() {
    return new Promise((resolve) => {
      this.props.cloudFormation.deploy.getOutputs().then((outputs) => {
        resolve(outputs.ApiGatewayRestApiBaseUrl);
      });
    });
  }

  getStorageBaseUrl() {
    return new Promise((resolve) => {
      this.props.cloudFormation.deploy.getOutputs().then((outputs) => {
        resolve(`https://${outputs.SqueezerDeploymentBucketDomain}`);
      });
    });
  }

  deployBaseResources() {
    return new Promise((resolve) => {
      this.props.cloudFormation.deploy.init().then((status) => {
        if (status) {
          resolve();
        } else {
          this.props.cloudFormation.addBaseStacks().then(() => {
            this.props.cloudFormation.buildCfTemplates();
            this.props.cloudFormation.uploadCfTemplates().then(() => {
              this.props.cloudFormation.deploy.update().then(() => {
                resolve();
              });
            });
          });
        }
      });
    });
  }
}

module.exports = Utils;
