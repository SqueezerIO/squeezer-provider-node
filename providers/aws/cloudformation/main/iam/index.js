'use strict';

const Base = require('../base');

/**
 * Class that manages CloudFormation IAM resources
 */
class Iam {
  constructor(props) {
    this.props = props;
  }

  compile() {
    const base   = new Base();

    this.props.stacks.iamStack = base.compile('IAM roles and policies stack');

    this.iamRole();
    this.iamPolicy();
  }

  iamRole() {
    this.props.stacks.iamStack.Resources.IamRoleLambdaExecution = {
      Type: 'AWS::IAM::Role',
      Properties: {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: [
                  'lambda.amazonaws.com'
                ]
              },
              Action: [
                'sts:AssumeRole'
              ]
            }
          ]
        },
        Path: '/'
      }
    };

    this.props.stacks.iamStack.Outputs.IamRoleLambdaExecution = {
      Description: 'Lambda function details',
      Value: {
        'Fn::GetAtt': [
          'IamRoleLambdaExecution',
          'Arn'
        ]
      }
    };
  }

  iamPolicy() {
    const policyName = `${this.props.vars.identifier}-${this.props.vars.stage}`;

    this.props.stacks.iamStack.Resources.IamPolicyLambdaExecution = {
      Type: 'AWS::IAM::Policy',
      Properties: {
        PolicyName: policyName,
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: ['*'],
              Resource: '*'
            }
          ]
        },
        Roles: [
          {
            Ref: 'IamRoleLambdaExecution'
          }
        ]
      }
    };
  }
}

module.exports = Iam;
