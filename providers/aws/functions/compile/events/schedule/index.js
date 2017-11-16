'use strict';

/**
 * Class that manages the schedule event
 */
class scheduleEvent {
  constructor(props) {
    this.props          = props;
  }

  compile(functionObject) {
    this.serviceIdentifier = functionObject.serviceIdentifier;
    this.lambdaLogicalId   = this.props.utils.lambdaLogicalId(functionObject.identifier);    
    this.scheduleLogicalId = `${this.lambdaLogicalId}EventRule`;
    this.scheduleValue     = functionObject.event.rate;

    this.addRule();
    this.addPermissions();

    return this.template;
  }

  addRule() {
    this.props.cloudFormation.stacks[this.serviceIdentifier].Resources[`${this.scheduleLogicalId}`] = {
      Type       : 'AWS::Events::Rule',
      Properties : {
        ScheduleExpression : `rate(${this.scheduleValue})`,
        State              : 'ENABLED',
        Targets            : [
          {
            Arn : {
              'Fn::GetAtt' : [
                this.lambdaLogicalId,
                'Arn'
              ]
            },
            Id  : this.scheduleLogicalId
          }
        ]
      }
    };
  }

  addPermissions() {
    this.props.cloudFormation.stacks[this.serviceIdentifier].Resources[`${this.scheduleLogicalId}Permission`] = {
      Type       : 'AWS::Lambda::Permission',
      Properties : {
        FunctionName : {
          'Fn::GetAtt' : [
            this.lambdaLogicalId,
            'Arn'
          ]
        },
        Action       : 'lambda:InvokeFunction',
        Principal    : 'events.amazonaws.com',
        SourceArn    : {
          'Fn::GetAtt' : [
            this.scheduleLogicalId,
            'Arn'
          ]
        }
      }
    };
  }
}

module.exports = scheduleEvent;
