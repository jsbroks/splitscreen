#!/bin/bash

# Script to make a user an admin
# Usage: ./make-admin.sh <username>

# Configuration
API_KEY="${INTERNAL_API_KEY:-your-api-key-here}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
USERNAME="${1}"

# Check if username is provided
if [ -z "$USERNAME" ]; then
    echo "Error: Username is required"
    echo "Usage: $0 <username>"
    echo ""
    echo "Example: $0 johndoe"
    echo ""
    echo "Set INTERNAL_API_KEY environment variable or edit this script"
    exit 1
fi

# Check if API key is set
if [ "$API_KEY" = "your-api-key-here" ]; then
    echo "Warning: Using placeholder API key. Set INTERNAL_API_KEY environment variable or edit this script."
fi

# Make the request
echo "Making user '$USERNAME' an admin..."
echo ""

response=$(curl -s -w "\n%{http_code}" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "{\"username\":\"$USERNAME\"}" \
    "$BASE_URL/api/v1/admin")

# Extract HTTP status code (last line)
http_code=$(echo "$response" | tail -n1)

# Extract response body (everything except last line)
body=$(echo "$response" | sed '$d')

# Print response
echo "Response:"
echo "$body" | jq '.' 2>/dev/null || echo "$body"
echo ""
echo "HTTP Status: $http_code"

# Exit with appropriate code
if [ "$http_code" = "200" ]; then
    exit 0
else
    exit 1
fi

