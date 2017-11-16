'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const Base = require('../main/base');

/**
 * Class representing microservice's AWS S3 bucket upload
 */
class DeployStack {
  constructor(props) {
    this.props = props;

    const api = this.props.api.init();
    this.client = new api.CloudFormation();
  }

  init() {
    const mainStack = this.props.mainStackName;
    const vars = this.props.vars;

    return new Promise((resolve, reject) => {
      this.client.describeStacks({ StackName: mainStack }, (error, res) => {
        const waitTypes = {
          CREATE_IN_PROGRESS: 'stackCreateComplete',
          UPDATE_IN_PROGRESS: 'stackUpdateComplete',
          DELETE_IN_PROGRESS: 'stackDeleteComplete'
        };

        let stackStatus = null;

        if (res) {
          stackStatus = res.Stacks[0].StackStatus;

          this.processOutput(res);
        }

        if (error && error.message === `Stack with id ${mainStack} does not exist`) {
          const base = new Base();

          const template = base.compile(`${vars.name} - CloudFormation main`);
          _.assign(template, base.addS3DeploymentBucket());

          const params = {
            StackName: mainStack,
            OnFailure: 'ROLLBACK',
            Capabilities: [
              'CAPABILITY_IAM'
            ],
            Parameters: [],
            TemplateBody: JSON.stringify(template, null, 2),
            Tags: [
              {
                Key: 'STAGE',
                Value: vars.stage
              }
            ]
          };

          this.client.createStack(params, (err) => {
            if (err) {
              return reject(err);
            }
            this.progress('CREATE').then(() => {
              return resolve();
            });
          });
        } else if (_.includes(_.keys(waitTypes), stackStatus)) {
          const waitVal = waitTypes[stackStatus];
          this.client.waitFor(waitVal, { StackName: mainStack }, () => {
            return resolve(stackStatus);
          });
        } else if (error) {
          return reject(error);
        } else {
          return resolve(stackStatus);
        }
      });
    });
  }

  update() {
    const mainStack = this.props.mainStackName;
    const vars = this.props.vars;

    return new Promise((resolve, reject) => {
      const templateUrl = `https://s3.amazonaws.com/${this.props.outputs.SqueezerDeploymentBucket}` +
        '/cloudformation/mainStack-template.json';

      const params = {
        StackName: mainStack,
        Capabilities: [
          'CAPABILITY_IAM'
        ],
        Parameters: [],
        TemplateURL: templateUrl,
        Tags: [
          {
            Key: 'STAGE',
            Value: vars.stage
          }
        ]
      };

      this.client.updateStack(params, (error) => {
        if (error && error.message === 'No updates are to be performed.') {
          return resolve();
        } else if (error) {
          return reject(error);
        }

        this.progress('UPDATE').then(() => {
          return resolve();
        });
      });
    });
  }

  progress(type) {
    const mainStack = this.props.mainStackName;
    
    return new Promise((resolve, reject) => {
      const startTime = new Date();
      const timeout = 600; // seconds

      const waitTypes = {
        EXIST: 'stackExists',
        CREATE: 'stackCreateComplete',
        UPDATE: 'stackUpdateComplete',
        DELETE: 'stackDeleteComplete'
      };

      const interval = setInterval(() => {
        const currentTimer = Math.round((new Date() - startTime) / 1000);

        if (currentTimer >= timeout) {
          return reject(
            `Cloudformation ${type} stack timeout !`
          );
        }
      });

      this.client.waitFor(waitTypes[type], { StackName: mainStack }, (err, data) => {
        if (err && err.code === 'ResourceNotReady') {
          this.client.describeStackEvents({ StackName: mainStack }, (error, output) => {
            if (output && output.StackEvents) {
              output.StackEvents.forEach((stackEvent) => {
                if (stackEvent.ResourceStatus.indexOf('FAILED') > -1) {
                  return reject(
                    'CloudFormation Error:\n\n' +
                    `RESOURCE : ${stackEvent.LogicalResourceId}\n` +
                    `${stackEvent.ResourceStatus} : ${stackEvent.ResourceStatusReason}`
                  );
                }
              });
            } else {
              return reject(error);
            }
          });
        } else if (err) {
          return reject(err);
        } else {
          clearInterval(interval);
          this.processOutput(data);
          return resolve();
        }
      });
    });
  }

  processOutput(data) {
    if (_.has(data, 'Stacks')) {
      data.Stacks.forEach((stack) => {
        stack.Outputs.forEach((output) => {
          this.props.outputs[output.OutputKey] = output.OutputValue;
        });
      });
    }
  }

  getOutputs() {
    return new Promise((resolve, reject) => {
      if (_.keys(this.props.outputs).length === 0) {
        this.client.describeStacks({ StackName: this.props.mainStackName }, (err, res) => {
          if (err) return reject(err);

          this.processOutput(res);

          return resolve(this.props.outputs);
        });
      } else {
        return resolve(this.props.outputs);
      }
    });
  }
}

module.exports = DeployStack;
