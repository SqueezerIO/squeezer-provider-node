'use strict';

const _ = require('lodash');
const Aws = require('./providers/aws');

class Provider {
  constructor(vars) {
    this.vars = vars;
    this.providers = {
      aws: Aws.bind()
    };
  }

  init() {
    const providerName = this.vars.config.provider;

    if (_.isEmpty(providerName)) {
      throw new Error('Missing provider name from config');
    }

    if (!_.has(this.providers, providerName)) {
      throw new Error(`There is no current provider "${providerName}" added to the provider library`);
    }

    const provider = new this.providers[providerName](this.vars);

    return provider;
  }
}

module.exports = Provider;
