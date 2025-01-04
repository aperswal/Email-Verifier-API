# Email Verification Service

A serverless email verification service built with AWS Lambda that verifies email addresses through multiple checks including syntax validation, disposable email detection, MX record verification, and SMTP checking.

## Features

- Syntax validation
- Disposable email detection using comprehensive blocklist
- MX record verification
- SMTP verification via AWS SES
- Response caching using DynamoDB
- Pay-as-you-go pricing
- Automatic blocklist updates
- CORS enabled
- JSON API

## Prerequisites

- Node.js 18.x or later
- AWS Account
- Serverless Framework
- AWS CLI configured with appropriate credentials

## Installation

1. Clone the repository or create a new directory:
```bash
mkdir email-verifier
cd email-verifier
```

2. Install dependencies:
```bash
npm install aws-sdk node-fetch
npm install -g serverless
```

3. Configure AWS credentials:
```bash
aws configure
```
Enter your AWS access key ID and secret access key when prompted.

## Project Structure

```
email-verifier/
├── handler.js          # Main Lambda function logic
├── serverless.yml      # Serverless Framework configuration
└── package.json        # Project dependencies
```

## Configuration Files

### serverless.yml
```yaml
service: email-verifier-api

provider:
  name: aws
  runtime: nodejs18.x
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'us-east-1'}
  
  environment:
    DYNAMODB_TABLE: ${self:service}-${opt:stage, self:provider.stage}
    BLOCKLIST_URL: https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf
    CACHE_TTL: 86400 # 24 hours in seconds
```

### package.json
```json
{
  "name": "email-verifier",
  "version": "1.0.0",
  "description": "Email verification service with disposable email detection",
  "main": "handler.js",
  "dependencies": {
    "aws-sdk": "^2.1540.0",
    "node-fetch": "^2.7.0"
  },
  "scripts": {
    "deploy": "serverless deploy",
    "local": "serverless offline"
  }
}
```

## Deployment

Deploy the service:
```bash
serverless deploy
```

After deployment, you'll receive an API endpoint URL:

```
endpoints:
  POST - https://xxxxx.execute-api.us-east-1.amazonaws.com/dev/verify
```

Mine is currently:
https://trgiqyj4m6.execute-api.us-east-1.amazonaws.com/dev/verify 

## API Usage

### Endpoint
POST /verify

### Request Format
```json
{
  "email": "test@example.com"
}
```

### Response Format
```json
{
  "result": {
    "email": "test@example.com",
    "syntax": true,
    "disposable": false,
    "mxRecord": true,
    "smtp": true,
    "verified": true
  }
}
```

### Response Fields
- `syntax`: Email format is valid
- `disposable`: Email is from a disposable domain
- `mxRecord`: Domain has valid MX records
- `smtp`: SMTP verification successful
- `verified`: Overall verification status

### Example Usage

```bash
curl -X POST \
  https://your-api-endpoint/verify \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com"}'
```

## Monitoring and Maintenance

### AWS Console Access
1. DynamoDB Table: AWS Console > DynamoDB > Tables > "email-verifier-api-dev"
2. Lambda Function: AWS Console > Lambda > "email-verifier-api-dev-verifyEmail"
3. API Gateway: AWS Console > API Gateway > "email-verifier-api-dev"
4. Logs: AWS Console > CloudWatch > Log groups > "/aws/lambda/email-verifier-api-dev-verifyEmail"
5. Costs: AWS Console > Billing > Cost Explorer

### CloudWatch Logs
Monitor function execution and errors:
```bash
serverless logs -f verifyEmail
```

### Cost Management
- Lambda: Free tier includes 1M requests/month
- API Gateway: Free tier includes 1M requests/month
- DynamoDB: Free tier includes 25GB storage
- SES: $0.10 per 1000 email verifications

## Security Considerations

1. API Gateway Throttling
- Default limit: 10,000 requests per second
- Can be adjusted in API Gateway settings

2. Cache TTL
- Default: 24 hours
- Configurable in serverless.yml

3. AWS IAM Roles
- Limited to required services
- Principle of least privilege

## Troubleshooting

### Common Issues

1. Deployment Failures
```bash
serverless deploy --verbose
```

2. Rate Limiting
Check CloudWatch Logs for 429 errors

3. SES Verification Issues
- Ensure SES is out of sandbox mode
- Check SES quota limits

### Updating the Service

1. Modify code in handler.js
2. Update configuration in serverless.yml if needed
3. Deploy changes:
```bash
serverless deploy
```

## Cost Optimization

1. Cache Management
- Adjust CACHE_TTL in serverless.yml
- Monitor DynamoDB usage

2. Lambda Configuration
- Adjust memory allocation
- Monitor execution times

3. API Gateway
- Enable caching if needed
- Set up usage plans

## AWS Resource Cleanup

To remove all resources:
```bash
serverless remove
```

This will delete:
- Lambda function
- API Gateway
- DynamoDB table
- IAM roles
- CloudWatch log groups

## Support and Maintenance

### Regular Tasks
1. Monitor CloudWatch logs for errors
2. Check AWS billing for unusual charges
3. Update node dependencies
4. Review and update disposable email blocklist

### AWS Health Checks
1. Monitor Lambda execution times
2. Check API Gateway latency
3. Review DynamoDB capacity
4. Monitor SES quota usage

## License

MIT License - See LICENSE file for details