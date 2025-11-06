// Utility for testing token expiration
// This is for development/testing purposes only

export function createTestTokenWithExpiration(expirationMinutes: number = 1): string {
  // This creates a mock JWT token with a custom expiration for testing
  // In a real scenario, this would be done on the backend
  
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "test@example.com",
    exp: now + (expirationMinutes * 60), // Expires in specified minutes
    iat: now
  };
  
  // Base64 encode header and payload
  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  
  // Create a simple signature (not cryptographically secure - for testing only)
  const signature = btoa("test-signature");
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp;
    if (!exp) return true;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}
