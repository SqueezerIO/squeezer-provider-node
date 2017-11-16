'use strict';

const Promise = require('bluebird');
const FunctionsUtils = require('../../../../../utils/functions');

class Utils {
  constructor(functions, props) {
    this.functions = functions;
    this.props = props;
    this.api = props.api.init();
    this.s3Client = new this.api.S3();
  }

  cleanFunctions() {
    const functionsUtils = new FunctionsUtils(this.functions);
    const cleanFunctions = functionsUtils.getDeployFunctions();

    return new Promise((resolve) => {
      Promise.each(cleanFunctions, (functionObject) => {
        return this.cleanFunction(functionObject);
      }).then(() => {
        resolve();
      });
    });
  }

  cleanFunction(functionObject) {
    return new Promise((resolve) => {
      this.props.cloudFormation.deploy.getOutputs().then((outputs) => {
        const params = {
          Bucket: outputs.SqueezerDeploymentBucket,
          Prefix: `functions/${functionObject.identifier}`
        };

        const maxS3Objects = 5;

        this.s3Client.listObjects(params, (err, data) => {
          const delParams  = {
            Bucket : outputs.SqueezerDeploymentBucket,
            Delete : {
              Objects : []
            }
          };

          if (err) {
            return reject(err);
          }

          const formatDate = (date) => {
            return new Date(date).getTime();
          };

          const sortedData = data.Contents.sort((a, b) =>
            formatDate(a.LastModified) > formatDate(b.LastModified));

          if (sortedData.length >= maxS3Objects) {
            sortedData.slice(1).forEach((obj) => {
              delParams.Delete.Objects.push({ Key : obj.Key });
            });

            this.s3Client.deleteObjects(delParams, (s3Err) => {
              if (err) {
                reject(s3Err);
              }
              resolve();
            });
          } else {
            resolve();
          }
        });
      });
    });
  }
}

module.exports = Utils;
