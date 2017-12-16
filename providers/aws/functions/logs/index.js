'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const colors = require('colors');
const moment = require('moment');
const os      = require('os');

module.exports = (functionObject, eventInput, props) => {
  const api = props.api.init();
  const cloudWatchClient = new api.CloudWatchLogs();
  const lambdaLogicalId = props.utils.lambdaLogicalId(functionObject.identifier);
  const stage = props.vars.stage;
  const logGroupName = `/aws/lambda/${lambdaLogicalId}-${stage}`;

  const getLogStreams = () => {
    return new Promise((resolve, reject) => {
      const params = {
        logGroupName: logGroupName,
        descending: true,
        limit: 50,
        orderBy: 'LastEventTime'
      };

      cloudWatchClient.describeLogStreams(params, (err, data) => {
        if (err) return reject(err);

        const logStreamNames = _.chain(data.logStreams)
          .filter(stream => stream.logStreamName.includes('[$LATEST]'))
          .map('logStreamName')
          .value();

        resolve(logStreamNames);
      });
    });
  };

  const displayLogs = (logStreamNames) => {
    const valDate = (splittedDate, msg) => {
      if (splittedDate.length < 3 || new Date(splittedDate[0]) === 'Invalid Date') {
        return msg;
      }
    };

    const formatLambdaLogEvent = (msgParam) => {
      let msg = msgParam;
      const dateFormat = 'YYYY-MM-DD HH:mm:ss.SSS (Z)';

      if (msg.startsWith('REPORT')) {
        msg += os.EOL;
      }
      if (msg.startsWith('START') || msg.startsWith('END') || msg.startsWith('REPORT')) {
        return colors.yellow(msg);
      } else if (msg.trim().indexOf('Process exited before completing request') > -1) {
        return colors.red(msg);
      }

      const splitted = msg.split('\t');

      valDate(splitted, msg);

      const reqId = splitted[1];
      const time = colors.green(moment(splitted[0]).format(dateFormat));
      const text = msg.split(`${reqId}\t`)[1];

      return `${time}\t${colors.yellow(reqId)}\t\n${text}`;
    };

    const params = {
      logGroupName: logGroupName,
      logStreamNames: logStreamNames
    };


    return cloudWatchClient.filterLogEvents(params, (err, data) => {
      if (err) return reject(err);

      if (data.events) {
        data.events.forEach((e) => {
          process.stdout.write(formatLambdaLogEvent(e.message));
        });
        process.stdout.write('\n');
      }
    });
  };

  return new Promise((resolve) => {
    getLogStreams().then((logStreamNames) => {
      displayLogs(logStreamNames);
      resolve();
    });
  });
};
