'use strict';

const _ = require('lodash');

class FunctionsUtils {
  constructor(functions) {
    this.functions = functions;
  }

  getDeployFunctions() {
    const functions = this.functions;

    return _.keys(functions).reduce((stack, key) => {
      const funcObj = functions[key];

      if ((funcObj.flagged && funcObj.changed)
        || (funcObj.flagged && funcObj.force)) stack.push(funcObj);
      return stack;
    }, []);
  }
}

module.exports = FunctionsUtils;
