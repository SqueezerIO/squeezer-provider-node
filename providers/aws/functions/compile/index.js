'use strict';

const _ = require('lodash');
const BaseTemplate = require('../../cloudformation/main/base');
const Lambda = require('./lambda');
const HttpEvent = require('./events/http');
const ScheduleEvent = require('./events/schedule');

module.exports = (functions, props) => {
  const lambda = new Lambda(props);
  const httpEvent = new HttpEvent(props);
  const scheduleEvent = new ScheduleEvent(props);

  const addServiceTemplate = (functionObject) => {
    const service = functionObject.serviceIdentifier;

    if (!_.has(props.cloudFormation.stacks, service)) {
      const baseTemplate = new BaseTemplate();
      props.cloudFormation.stacks[service] = baseTemplate.compile(
        `${service} stack`
      );

      props.cloudFormation.stacks.mainStack.Resources[service] = {
        Type: 'AWS::CloudFormation::Stack',
        Properties: {
          TemplateURL: `https://s3.amazonaws.com/${props.cloudFormation.outputs.SqueezerDeploymentBucket}/` +
          `cloudformation/${service}-template.json`,
          TimeoutInMinutes: 10,
          Parameters: {
            ApiGatewayRestApiId: {
              'Fn::GetAtt': ['ApiGatewayStack', 'Outputs.ApiGatewayRestApiId']
            },
            IamRoleLambdaExecution: {
              'Fn::GetAtt': ['iamStack', 'Outputs.IamRoleLambdaExecution']
            }
          }
        },
        DependsOn: ['iamStack', 'ApiGatewayStack']
      };

      props.cloudFormation.stacks.mainStack.Resources.ApiGatewayDeploymentStack.DependsOn
        .push(service);
    }
  };

  _.forEach(functions, (functionObject) => {
    const eventType = functionObject.event.type;

    addServiceTemplate(functionObject);
    lambda.compile(functionObject);
    if (eventType === 'http') {
      httpEvent.compile(functionObject);
    }

    if (eventType === 'schedule') {
      scheduleEvent.compile(functionObject);
    }
  });
};
