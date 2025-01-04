const AWS = require('aws-sdk');
const dns = require('dns');
const { promisify } = require('util');
const fetch = require('node-fetch');

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();
const resolveMx = promisify(dns.resolveMx);

// Function to fetch and cache blocklist
let DISPOSABLE_DOMAINS = new Set();
let lastBlocklistUpdate = 0;
const BLOCKLIST_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const BLOCKLIST_URL = 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf';

// Extended fallback list of known disposable domains
const FALLBACK_DOMAINS = new Set([
  'tempmail.com',
  'throwawaymail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.net',
  'temp-mail.org',
  'yopmail.com',
  'disposablemail.com',
  'sharklasers.com',
  'spam4.me',
  'dispostable.com'
]);

async function updateBlocklist() {
  if (Date.now() - lastBlocklistUpdate < BLOCKLIST_CACHE_DURATION && DISPOSABLE_DOMAINS.size > 0) {
    return;
  }

  try {
    console.log('Fetching disposable email blocklist...');
    const response = await fetch(BLOCKLIST_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch blocklist: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    
    // Split by newlines and filter empty lines and comments
    const domains = text.split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line && !line.startsWith('#'));
    
    // Combine fetched domains with fallback domains
    DISPOSABLE_DOMAINS = new Set([...domains, ...FALLBACK_DOMAINS]);
    lastBlocklistUpdate = Date.now();
    console.log(`Updated blocklist with ${DISPOSABLE_DOMAINS.size} domains`);

    // Log sample domains for verification
    const sampleDomains = Array.from(DISPOSABLE_DOMAINS).slice(0, 5);
    console.log('Sample blocked domains:', sampleDomains);
  } catch (error) {
    console.error('Failed to update blocklist:', error);
    // If update fails, use the fallback list
    DISPOSABLE_DOMAINS = new Set(FALLBACK_DOMAINS);
    console.log('Using fallback blocklist');
  }
}

// Enhanced MX record checking
async function checkMXRecords(domain) {
  try {
    const records = await resolveMx(domain);
    // Ensure we have valid MX records with proper priorities
    return records && records.length > 0 && records.some(record => record.priority >= 0);
  } catch (error) {
    console.log(`MX lookup failed for ${domain}:`, error.message);
    return false;
  }
}

const createResponse = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  },
  body: JSON.stringify(body),
});

const checkCache = async (email) => {
  try {
    const result = await dynamoDb.get({
      TableName: process.env.DYNAMODB_TABLE,
      Key: { email },
    }).promise();

    if (result.Item && result.Item.ttl > Math.floor(Date.now() / 1000)) {
      return result.Item.verification;
    }
    return null;
  } catch (error) {
    console.error('Cache check failed:', error);
    return null;
  }
};

const updateCache = async (email, verification) => {
  const ttl = Math.floor(Date.now() / 1000) + parseInt(process.env.CACHE_TTL);
  
  try {
    await dynamoDb.put({
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        email,
        verification,
        ttl,
      },
    }).promise();
  } catch (error) {
    console.error('Cache update failed:', error);
  }
};

exports.verifyEmail = async (event) => {
  try {
    const { email } = JSON.parse(event.body);

    if (!email) {
      return createResponse(400, { error: 'Email is required' });
    }

    // Check cache first
    const cachedResult = await checkCache(email);
    if (cachedResult) {
      return createResponse(200, { 
        cached: true,
        result: cachedResult 
      });
    }

    // Update blocklist if needed
    await updateBlocklist();

    const verification = {
      email,
      syntax: false,
      disposable: false,
      mxRecord: false,
      smtp: false,
      verified: false
    };

    // 1. Syntax Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    verification.syntax = emailRegex.test(email);
    if (!verification.syntax) {
      await updateCache(email, verification);
      return createResponse(200, { result: verification });
    }

    // 2. Disposable Check
    const domain = email.split('@')[1].toLowerCase();
    // Check if the domain or any of its parts match the blocklist
    const domainParts = domain.split('.');
    for (let i = 0; i < domainParts.length - 1; i++) {
      const checkDomain = domainParts.slice(i).join('.');
      if (DISPOSABLE_DOMAINS.has(checkDomain)) {
        verification.disposable = true;
        break;
      }
    }
    
    if (verification.disposable) {
      await updateCache(email, verification);
      return createResponse(200, { result: verification });
    }

    // 3. Enhanced MX Record Check
    verification.mxRecord = await checkMXRecords(domain);
    if (!verification.mxRecord) {
      await updateCache(email, verification);
      return createResponse(200, { result: verification });
    }

    // 4. SMTP Verification via SES
    try {
      await ses.verifyEmailAddress({ EmailAddress: email }).promise();
      verification.smtp = true;
      verification.verified = true;
    } catch (error) {
      console.log(`SMTP verification failed for ${email}:`, error.message);
      verification.smtp = false;
      verification.verified = false;
    }

    // Update cache with final result
    await updateCache(email, verification);

    return createResponse(200, { result: verification });
  } catch (error) {
    console.error('Verification failed:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
};