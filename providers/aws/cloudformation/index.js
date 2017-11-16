'use strict';

const _ = require('lodash');
const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const Base = require('./main/base');
const Iam = require('./main/iam');
const ApiGateway = require('./main/apiGateway');
const Deploy = require('./deploy');

class CloudFormation {
  constructor(props) {
    this.stacks = {};
    this.outputs = {};
    this.storage = props.storage;
    this.vars = props.vars;
    this.api = props.api;
    this.mainStackName = `${this.vars.identifier}-${this.vars.stage}`;
    this.cloudFormationBuildPath = path.join(props.vars.path, '.build', 'cloud', 'cloudformation');

    this.deploy = new Deploy(this);

    if (!fs.existsSync(this.cloudFormationBuildPath)) {
      fsExtra.emptyDirSync(this.cloudFormationBuildPath);
    }
  }

  addBaseStacks() {
    const iam = new Iam(this);
    const apiGateway = new ApiGateway(this);
    const base = new Base(this);

    return new Promise((resolve) => {
      this.deploy.getOutputs().then(() => {
        this.stacks.mainStack = base.compile(
          'main stack'
        );

        this.stacks.mainStack = base.addS3DeploymentBucket();

        iam.compile();
        apiGateway.compile();

        resolve();
      });
    });
  }

  buildCfTemplates() {
    const stacks = this.stacks;

    _.forEach(stacks, (val, key) => {
      const filename = `${key}-template.json`;

      if (key !== 'mainStack') {
        if (!_.has(this.stacks.mainStack.Resources, key)) {
          this.stacks.mainStack.Resources[key] = {
            Type: 'AWS::CloudFormation::Stack',
            Properties: {
              TemplateURL: `https://s3.amazonaws.com/${this.outputs.SqueezerDeploymentBucket}` +
              `/cloudformation/${key}-template.json`,
              TimeoutInMinutes: 10
            }
          };
        }

        this.writeTemplate(filename, val);
      }
    });

    this.writeTemplate('mainStack-template.json', this.stacks.mainStack);
  }

  writeTemplate(filename, data) {
    const cfPath = path.join(this.cloudFormationBuildPath, filename);

    fs.writeFileSync(cfPath, JSON.stringify(data, null, 2));
  }

  uploadCfTemplates() {
    return new Promise((resolve) => {
      this.storage.uploadDir(this.cloudFormationBuildPath, 'cloudformation').then(() => {
        resolve();
      });
    });
  }
}

module.exports = CloudFormation;
