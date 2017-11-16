'use strict';

/**
 * Class that manages API Gateway CloudFormation resources
 */
class AWSLambda {
  constructor(props) {
    this.props          = props;
  }

  compile(functionObject) {
    const vars = this.props.vars;
    const outputs = this.props.cloudFormation.outputs;
    const runtime   = vars.runtime;
    const runtimeVersion   = vars.runtimeVersion || '6.10';
    const functionName = functionObject.name;
    const serviceIdentifier = functionObject.serviceIdentifier;
    const logicalId = this.props.utils.lambdaLogicalId(functionObject.identifier);
    const s3FunctionKey = this.props.utils.s3FunctionKey(functionObject);

    this.props.cloudFormation.stacks[serviceIdentifier].Resources[logicalId] = {
      Type       : 'AWS::Lambda::Function',
      Properties : {
        Code         : {
          S3Bucket : outputs.SqueezerDeploymentBucket,
          S3Key    : s3FunctionKey
        },
        FunctionName : `${logicalId}-${vars.stage}`,
        Description  : `Lambda function ${functionName}`,
        Handler      : `handler.${functionObject.handler}`,
        MemorySize   : functionObject.memory,
        Role         : {
          Ref : 'IamRoleLambdaExecution'
        },
        Runtime      : `${runtime}${runtimeVersion}`,
        Timeout      : functionObject.timeout
      }
    };

    this.props.cloudFormation.stacks[serviceIdentifier].Parameters.ApiGatewayRestApiId = {
      Type : 'String'
    };

    this.props.cloudFormation.stacks[serviceIdentifier].Parameters.IamRoleLambdaExecution = {
      Type : 'String'
    };
  }
}

module.exports = AWSLambda;
