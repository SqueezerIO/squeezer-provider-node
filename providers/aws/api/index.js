'use strict';

const AWS = require('aws-sdk/global');
const S3 = require('aws-sdk/clients/s3');
const CloudFormation = require('aws-sdk/clients/cloudformation');
const Lambda = require('aws-sdk/clients/lambda');
const CloudWatchLogs = require('aws-sdk/clients/cloudwatchlogs');

const _ = require('lodash');

class Api {
  constructor(props) {
    this.props = props;
    this.api = null;
  }

  init() {
    const vars = this.props.vars;

    const accessKeyId = vars.config.aws_access_key_id;
    const secretAccessKey = vars.config.aws_secret_access_key;
    const region = vars.config.aws_region;

    if (!this.api) {
      _.assign(process.env, {
        AWS_ACCESS_KEY_ID: accessKeyId,
        AWS_SECRET_ACCESS_KEY: secretAccessKey
      });

      AWS.config.update({ region: region });

      this.api = {
        S3 : S3.bind(),
        CloudFormation : CloudFormation.bind(),
        Lambda : Lambda.bind(),
        CloudWatchLogs : CloudWatchLogs.bind()
      };
    }

    return this.api;
  }
}

module.exports = Api;
