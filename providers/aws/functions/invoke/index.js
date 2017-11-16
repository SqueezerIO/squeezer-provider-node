'use strict';

const Promise = require('bluebird');
const colors = require('colors');
const moment = require('moment');

module.exports = (functionObject, eventInput, props) => {
  const log = (reply) => {
    const color = !reply.FunctionError ? 'white' : 'red';
    if (reply.Payload) {
      const response = JSON.parse(reply.Payload);

      process.stdout.write(colors[color](JSON.stringify(response, null, 4)));
      process.stdout.write('\n');
    }

    const validateLine = (msg) => {
      if (msg.startsWith('START') || msg.startsWith('END') || msg.startsWith('REPORT')) {
        return colors.yellow(`\n${msg}`);
      }  if (msg.trim() === 'Process exited before completing request') {
        return colors.red(`\n${msg}`);
      }
    };

    const formatLog = (msg) => {
      const dateFormat = 'YYYY-MM-DD HH:mm:ss.SSS (Z)';

      const splitted = msg.split('\t');

      if (splitted.length < 3 || new Date(splitted[0]) === 'Invalid Date') {
        return msg;
      }
      const reqId = splitted[1];
      const time  = colors.green(moment(splitted[0]).format(dateFormat));
      const text  = msg.split(`${reqId}\t`)[1];

      return `${time}\t${colors.yellow(reqId)}\t\n\n${text}`;
    };

    if (reply.LogResult) {
      process.stdout.write(colors
        .gray('--------------------------------------------------------------------\n'));
      const logResult = new Buffer(reply.LogResult, 'base64').toString();
      logResult.split('\n').forEach(
        line => process.stdout.write(`${validateLine(line) || formatLog(line)}\n`)
      );
    }
  };

  const api = props.api.init();
  const lambdaClient = new api.Lambda();
  const lambdaLogicalId = props.utils.lambdaLogicalId(functionObject.identifier);
  const stage = props.vars.stage;

  return new Promise((resolve, reject) => {
    const params = {
      FunctionName   : `${lambdaLogicalId}-${stage}`,
      InvocationType : 'RequestResponse',
      LogType        : 'Tail',
      Payload        : new Buffer(JSON.stringify(eventInput))
    };

    lambdaClient.invoke(params, (err, data) => {
      if (err) return reject(err);

      log(data);

      return resolve(data);
    });
  });
};
