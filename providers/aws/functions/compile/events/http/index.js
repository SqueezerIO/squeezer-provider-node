'use strict';

const _                   = require('lodash');

/**
 * Class that manages the API Gateway event
 */
class httpEvent {
  constructor(props) {
    this.props          = props;
  }

  compile(functionObject) {
    const lambdaLogicalId = this.props.utils.lambdaLogicalId(functionObject.identifier);
    const event = functionObject.event;

    event.path = event.path.replace('*', '{wildcard+}');

    this.addPathParts(functionObject, event);
    this.addPermission(functionObject, lambdaLogicalId);

    _.forEach(event.methods, (method) => {
      this.addMethod(event, method, functionObject, lambdaLogicalId);
    });

    return this.template;
  }


  addMethod(event, method, functionObject, lambdaLogicalId) {
    const serviceIdentifier = functionObject.serviceIdentifier;
    const pathParts           = event.path.split('/').slice(1);
    const vars = this.props.vars;
    const pathPartsLen        = pathParts.length;
    let resourceParentId;

    const eventIdentifier = `${_.upperFirst(method)}` +
      `${_.upperFirst(_.camelCase(event.path))}`;
    const corsIdentifier = 'Options' +
      `${_.upperFirst(_.camelCase(event.path))}`;

    if (event.path === '/') {
      resourceParentId = 'ApiGatewayRootResourceId';
    } else {
      resourceParentId = this.getResourceIdentifier(event.path, pathPartsLen - 1);
    }

    this.props.cloudFormation.stacks[serviceIdentifier].Resources[`${eventIdentifier}Method`] = {
      Type       : 'AWS::ApiGateway::Method',
      Properties : {
        AuthorizationType : 'NONE',
        HttpMethod        : method.toUpperCase(),
        Integration       : {
          IntegrationHttpMethod : 'POST',
          Type                  : 'AWS_PROXY',
          Uri                   : {
            'Fn::Join' : [
              '',
              [
                'arn:aws:apigateway:',
                {
                  Ref : 'AWS::Region'
                },
                ':lambda:path/2015-03-31/functions/',
                {
                  'Fn::GetAtt' : [
                    lambdaLogicalId,
                    'Arn'
                  ]
                },
                '/invocations'
              ]
            ]
          }
        },
        ResourceId        : {
          Ref : resourceParentId
        },
        RestApiId         : {
          Ref : 'ApiGatewayRestApiId'
        }
      }
    };

    const responseHeaders = vars['response-http-headers'] || {};
    const corsHeaders = {};
    _.forEach(responseHeaders, (val, key) => {
      if (key.match(/^Access-Control.*/i)) {
        corsHeaders[key] = val;
      }
    });

    if (_.keys(corsHeaders).length > 0) {
      const integrationResponseParameters = {};
      const methodResponseParameters = {};

      _.forEach(responseHeaders, (val, key) => {
        integrationResponseParameters[`method.response.header.${key}`] = `'${val}'`;
        methodResponseParameters[`method.response.header.${key}`] = true;
      });

      this.props.cloudFormation.stacks[serviceIdentifier].Resources[`${corsIdentifier}Method`] = {
        Type       : 'AWS::ApiGateway::Method',
        Properties : {
          AuthorizationType    : 'NONE',
          HttpMethod           : 'OPTIONS',
          Integration          : {
            Type : 'MOCK',
            IntegrationResponses : [
              {
                ResponseParameters : integrationResponseParameters,
                ResponseTemplates  : {
                  'application/json' : ''
                },
                StatusCode         : 200
              }
            ],
            PassthroughBehavior  : 'WHEN_NO_TEMPLATES',
            RequestTemplates     : {
              'application/json' : '{"statusCode": 200}'
            }
          },
          MethodResponses      : [{
            StatusCode         : 200,
            ResponseModels     : {
              'application/json' : 'Empty'
            },
            ResponseParameters : methodResponseParameters
          }],
          ResourceId           : {
            Ref : resourceParentId
          },
          RestApiId            : {
            Ref : 'ApiGatewayRestApiId'
          }
        }
      };
    }

    this.props.cloudFormation.stacks[serviceIdentifier].Parameters.ApiGatewayRestApiId = {
      Type : 'String'
    };

    this.props.cloudFormation.stacks[serviceIdentifier].Parameters[resourceParentId] = {
      Type : 'String'
    };
  }

  addPermission(functionObject, lambdaLogicalId) {
    const serviceIdentifier = functionObject.serviceIdentifier;

    this.props.cloudFormation.stacks[serviceIdentifier].Resources[`${functionObject.identifier}FunctionApiGatewayPermission`] = {
      Type       : 'AWS::Lambda::Permission',
      Properties : {
        FunctionName : {
          'Fn::GetAtt' : [
            lambdaLogicalId,
            'Arn'
          ]
        },
        Action       : 'lambda:InvokeFunction',
        Principal    : 'apigateway.amazonaws.com'
      }
    };
  }

  addFunction(functionObj) {
    // add current function stack to the ApiGatewayDeploymentStack dependencies
    if (!_.includes(this.props.stacks.mainStack.Resources.ApiGatewayDeploymentStack.DependsOn,
      functionObj.serviceIdentifier)) {
      this.props.stacks.mainStack.Resources.ApiGatewayDeploymentStack
        .DependsOn.push(functionObj.serviceIdentifier);
    }
  }

  getResourceIdentifier(path, index) {
    const pathParts = path.split('/').slice(1).slice(0, index + 1).join('/');

    return `ApiGatewayResource${_.upperFirst(_.camelCase(pathParts))}`;
  }

  addPathParts(functionObject, event) {
    const serviceIdentifier = functionObject.serviceIdentifier;
    const pathParts = event.path.split('/').slice(1);

    _.forEach(pathParts, (value, key) => {
      const resourceId = this.getResourceIdentifier(event.path, key);
      const parentResourceId = this.getResourceIdentifier(event.path, key - 1);

      if (event.path !== '/') {
        this.props.cloudFormation.stacks.ApiGatewayStack.Resources[resourceId] = {
          Type: 'AWS::ApiGateway::Resource',
          Properties: {
            PathPart: value,
            RestApiId: {
              Ref: 'ApiGatewayRestApi'
            }
          }
        };

        if (key === 0) {
          this.props.cloudFormation.stacks.ApiGatewayStack
            .Resources[resourceId].Properties.ParentId = {
              'Fn::GetAtt': [
                'ApiGatewayRestApi',
                'RootResourceId'
              ]
            };
        } else if (key > 0) {
          this.props.cloudFormation.stacks.ApiGatewayStack
            .Resources[resourceId].Properties.ParentId = {
              Ref: parentResourceId
            };
        }

        if (key === (pathParts.length - 1)) {
          this.props.cloudFormation.stacks.mainStack.Resources[serviceIdentifier]
            .Properties.Parameters[resourceId] = {
              'Fn::GetAtt': ['ApiGatewayStack', `Outputs.${resourceId}`]
            };
        }

        this.props.cloudFormation.stacks.ApiGatewayStack.Outputs[resourceId] = {
          Value: {
            Ref: resourceId
          }
        };
      }
    });
  }
}

module.exports = httpEvent;
