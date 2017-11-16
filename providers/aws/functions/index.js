'use strict';

const Promise = require('bluebird');
const CompileFunctions = require('./compile');
const PackageFunctions = require('./package');
const UploadFunctions = require('./upload');
const DeployFunctions = require('./deploy');
const Invoke = require('./invoke');
const Logs = require('./logs');

class Functions {
  constructor(props) {
    this.props = props;
  }

  compile(functions) {
    return new Promise((resolve) => {
      this.props.cloudFormation.addBaseStacks().then(() => {
        CompileFunctions(functions, this.props);
        resolve();
      });
    });
  }

  package(functions) {
    return new Promise((resolve) => {
      PackageFunctions(functions, this.props).then(() => {
        resolve();
      });
    });
  }

  upload(functions) {
    return new Promise((resolve) => {
      UploadFunctions(functions, this.props).then(() => {
        resolve();
      });
    });
  }

  deploy(functions) {
    return new Promise((resolve) => {
      DeployFunctions(functions, this.props).then(() => {
        resolve();
      });
    });
  }

  invoke(functionObject, eventInput) {
    return new Promise((resolve) => {
      Invoke(functionObject, eventInput, this.props).then(() => {
        resolve();
      });
    });
  }

  logs(functionObject, eventInput) {
    return new Promise((resolve) => {
      Logs(functionObject, eventInput, this.props).then(() => {
        resolve();
      });
    });
  }
}

module.exports = Functions;
