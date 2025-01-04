#!/bin/bash

API_ENDPOINT="https://trgiqyj4m6.execute-api.us-east-1.amazonaws.com/dev/verify"

echo "1. Testing regular email (Gmail)..."
curl -X POST \
  $API_ENDPOINT \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@gmail.com"}'
echo -e "\n\n"

echo "2. Testing known disposable emails..."
echo "2.1 Testing 10minutemail..."
curl -X POST \
  $API_ENDPOINT \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@10minutemail.com"}'
echo -e "\n\n"

echo "2.2 Testing tempmail..."
curl -X POST \
  $API_ENDPOINT \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@tempmail.com"}'
echo -e "\n\n"

echo "2.3 Testing guerrillamail..."
curl -X POST \
  $API_ENDPOINT \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@guerrillamail.com"}'
echo -e "\n\n"

echo "3. Testing invalid email syntax..."
curl -X POST \
  $API_ENDPOINT \
  -H 'Content-Type: application/json' \
  -d '{"email": "notanemail"}'
echo -e "\n\n"

echo "4. Testing non-existent domain..."
curl -X POST \
  $API_ENDPOINT \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@thisisnotarealdomain.com"}'
echo -e "\n\n"

echo "5. Testing caching (running same request twice)..."
echo "First request:"
curl -X POST \
  $API_ENDPOINT \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com"}'
echo -e "\n\n"

echo "Second request (should show cached: true):"
curl -X POST \
  $API_ENDPOINT \
  -H 'Content-Type: application/json' \
  -d '{"email": "test@example.com"}'
echo -e "\n\n" 