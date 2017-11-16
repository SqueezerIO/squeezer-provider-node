'use strict';

const Utils = require('./utils');
const Api = require('./api');
const Storage = require('./storage');
const Functions = require('./functions');
const CloudFormation = require('./cloudformation');

class Main {
  constructor(vars) {
    this.vars = vars;

    this.api = new Api(this);
    this.utils = new Utils(this);
    this.functions = new Functions(this);
    this.storage = new Storage(this);
    this.cloudFormation = new CloudFormation(this);
  }

  init() {
    const accessKeyId = this.vars.config.aws_access_key_id;
    const secretAccessKey = this.vars.config.aws_secret_access_key;
    const region = this.vars.config.region;

    if (!accessKeyId || !secretAccessKey || !region) {
      throw new Error(
        'Credentials error , please check : \n\n' +
        'https://squeezer.io/docs/cloud/aws/credentials/ '
      );
    }
  }
}

module.exports = Main;
