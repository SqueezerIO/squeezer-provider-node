'use strict';

const s3 = require('./lib/s3');
const _ = require('lodash');
const Promise = require('bluebird');

class Storage {
  constructor(props) {
    this.props = props;
    this.api = props.api.init();
  }

  uploadFile(localPath, remotePath, options) {
    return new Promise((resolve, reject) => {
      this.props.cloudFormation.deploy.getOutputs().then((outputs) => {
        const awsS3Client = new this.api.S3();
        const client = s3.createClient({ s3Client: awsS3Client });

        const params = {
          localFile: localPath,

          s3Params: {
            Bucket: outputs.SqueezerDeploymentBucket,
            Key: remotePath
          }
        };

        if (_.has(options, 'public') && options.public === true) {
          params.s3Params.ACL = 'public-read';
        }

        const uploader = client.uploadFile(params);

        uploader.on('error', (err) => {
          reject(err);
        });

        uploader.on('end', () => {
          resolve({ success: true });
        });
      });
    });
  }

  uploadDir(localPath, remotePath, options) {
    return new Promise((resolve, reject) => {
      this.props.cloudFormation.deploy.getOutputs().then((outputs) => {
        const awsS3Client = new this.api.S3();
        const client = s3.createClient({
          s3Client: awsS3Client
        });

        const params = {
          localDir: localPath,
          s3Params: {
            Bucket: outputs.SqueezerDeploymentBucket,
            Prefix: remotePath
          }
        };

        if (_.has(options, 'sync') && options.sync === true) {
          params.deleteRemoved = true;
        }


        if (_.has(options, 'public') && options.public === true) {
          params.s3Params.ACL = 'public-read';
        }

        const uploader = client.uploadDir(params);

        uploader.on('error', (err) => {
          reject(err);
        });

        uploader.on('end', () => {
          resolve({ success: true });
        });
      });
    });
  }

  removeFile(remotePath) {
    return new Promise((resolve, reject) => {
      this.props.cloudFormation.deploy.getOutputs().then((outputs) => {
        const awsS3Client = new this.api.S3();

        const params = {
          Bucket: outputs.SqueezerDeploymentBucket,
          Key: remotePath
        };

        awsS3Client.deleteObject(params, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }
}

module.exports = Storage;
