#!/bin/bash

# Define user credentials
usernames=("alice" "bob" "carol" "dan")
passwords=("aaa" "bbb" "ccc" "ddd")

# Define API endpoints
BASE_URL="http://localhost:8080"
AUTH_ENDPOINT="/authenticate"
PUBLISHED_ARTICLES_ENDPOINT="/articles/published"
UNPUBLISHED_ARTICLES_ENDPOINT="/articles/unpublished"
POST_ARTICLES_ENDPOINT="/articles"
PATCH_ARTICLE_ENDPOINT="/articles/1"

# Function to authenticate and capture JWT cookie
authenticate() {
    local username=$1
    local password=$2
    echo "Authenticating $username..."
    jwt_cookie=$(http --session="${username}_session" POST "$BASE_URL$AUTH_ENDPOINT" username="$username" password="$password" | grep -o "jwt=[^;]*")
    echo "$username authenticated, JWT: $jwt_cookie"
}

# Function to test all endpoints using the JWT cookie
test_endpoints() {
    local username=$1

    echo "Testing endpoints for user: $username"

    # Access published articles
    echo "GET $PUBLISHED_ARTICLES_ENDPOINT"
    http --session="${username}_session" GET "$BASE_URL$PUBLISHED_ARTICLES_ENDPOINT"

    # Access unpublished articles
    echo "GET $UNPUBLISHED_ARTICLES_ENDPOINT"
    http --session="${username}_session" GET "$BASE_URL$UNPUBLISHED_ARTICLES_ENDPOINT"

    # Create a new article (POST request) with required 'title' and 'body'
    echo "POST $POST_ARTICLES_ENDPOINT with title and body"
    http --session="${username}_session" POST "$BASE_URL$POST_ARTICLES_ENDPOINT" title="Sample Title" body="Sample Body Content"

    # Update an article (PATCH request, assuming article ID 1 for simplicity)
    echo "PATCH $PATCH_ARTICLE_ENDPOINT"
    http --session="${username}_session" PATCH "$BASE_URL$PATCH_ARTICLE_ENDPOINT" published="true"
}

# Main script execution
for i in "${!usernames[@]}"; do
    username="${usernames[$i]}"
    password="${passwords[$i]}"
    
    # Authenticate user and store JWT
    authenticate "$username" "$password"
    
    # Test endpoints with authenticated session
    test_endpoints "$username"
done
