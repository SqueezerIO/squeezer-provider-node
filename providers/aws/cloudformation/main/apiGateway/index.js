'use strict';

/**
 * Class that manages the main API Gateway CloudFormation stack
 */
class awsCompileApiGateway {
  constructor(props) {
    this.props = props;
    this.apiGatewayName = `ApiGateway-${props.vars.identifier}-${props.vars.stage}`;
  }

  compile() {
    const vars = this.props.vars;
    const deploymentBucket = this.props.outputs.SqueezerDeploymentBucket;

    // initiate template stub
    this.props.stacks.ApiGatewayStack = {
      AWSTemplateFormatVersion: '2010-09-09',
      Description: 'API Gateway stack',
      Parameters: {
        ApiGatewayRestApiName: {
          Type: 'String',
          Default: this.apiGatewayName,
          Description: 'API Gateway name'
        }
      },
      Resources: {
        ApiGatewayRestApi: {
          Type: 'AWS::ApiGateway::RestApi',
          Properties: {
            Description: 'API Gateway REST',
            Name: {
              Ref: 'ApiGatewayRestApiName'
            }
          }
        },
        MockMethod: {
          Type: 'AWS::ApiGateway::Method',
          Properties: {
            RestApiId: { Ref: 'ApiGatewayRestApi' },
            ResourceId: {
              'Fn::GetAtt': ['ApiGatewayRestApi', 'RootResourceId']
            },
            HttpMethod: 'GET',
            AuthorizationType: 'NONE',
            Integration: {
              Type: 'MOCK'
            }
          }
        }
      },
      Outputs: {
        ApiGatewayRestApiId: {
          Value: {
            Ref: 'ApiGatewayRestApi'
          }
        },
        ApiGatewayRootResourceId: {
          Value: {
            'Fn::GetAtt': ['ApiGatewayRestApi', 'RootResourceId']
          }
        },
        ApiGatewayRestApiBaseUrl: {
          Value: {
            'Fn::Join': [
              '',
              [
                'https://',
                {
                  Ref: 'ApiGatewayRestApi'
                },
                `.execute-api.${vars.config.aws_region}.amazonaws.com/${vars.stage}`
              ]
            ]
          }
        }
      }
    };

    // add Api Gateway API name parameter to the main stack
    this.props.stacks.mainStack.Parameters.ApiGatewayRestApiName = {
      Type: 'String',
      Default: this.apiGatewayName,
      Description: `${vars.name} API Gateway`
    };

    // add nested CloudFormation API Gateway s3 template
    this.props.stacks.mainStack.Resources.ApiGatewayStack = {
      Type: 'AWS::CloudFormation::Stack',
      Properties: {
        TemplateURL: `https://s3.amazonaws.com/${deploymentBucket}` +
        '/cloudformation/ApiGatewayStack-template.json',
        TimeoutInMinutes: 10,
        Parameters: {
          ApiGatewayRestApiName: {
            Ref: 'ApiGatewayRestApiName'
          }
        }
      },
      DependsOn: ['iamStack']
    };

    // add API URL output in order to grab the URL base endpoint on CF deployment
    this.props.stacks.mainStack.Outputs.ApiGatewayRestApiBaseUrl = {
      Value: {
        'Fn::GetAtt': ['ApiGatewayStack', 'Outputs.ApiGatewayRestApiBaseUrl']
      }
    };

    // add API deployment stack
    this.props.stacks.mainStack.Resources.ApiGatewayDeploymentStack = {
      Type: 'AWS::CloudFormation::Stack',
      Properties: {
        TemplateURL: `https://s3.amazonaws.com/${deploymentBucket}` +
        '/cloudformation/ApiGatewayDeploymentStack-template.json',
        TimeoutInMinutes: 10,
        Parameters: {
          ApiGatewayRestApiId: {
            'Fn::GetAtt': ['ApiGatewayStack', 'Outputs.ApiGatewayRestApiId']
          }
        }
      },
      DependsOn: ['iamStack', 'ApiGatewayStack']
    };

    this.props.stacks.ApiGatewayDeploymentStack = {
      AWSTemplateFormatVersion: '2010-09-09',
      Description: 'API Gateway Deployment stack',
      Parameters: {
        ApiGatewayRestApiId: {
          Type: 'String'
        }
      },
      Resources: {}
    };

    this.props.stacks.ApiGatewayDeploymentStack.Resources[`ApiGatewayDeployment${Date.now()}`] = {
      Type: 'AWS::ApiGateway::Deployment',
      Properties: {
        RestApiId: {
          Ref: 'ApiGatewayRestApiId'
        },
        StageName: vars.stage
      }
    };
  }
}

module.exports = awsCompileApiGateway;
