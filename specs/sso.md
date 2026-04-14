# OmniDial SSO Specification

## Overview

Enterprise-grade Single Sign-On (SSO) supporting SAML 2.0 and OpenID Connect (OIDC) protocols. Enables organizations to manage OmniDial access through their existing identity providers (IdPs).

---

## Supported Identity Providers

### SAML 2.0
- Okta
- Azure AD (Entra ID)
- OneLogin
- Google Workspace
- PingIdentity
- JumpCloud
- Auth0
- Custom SAML IdPs

### OpenID Connect (OIDC)
- Okta
- Azure AD (Entra ID)
- Google
- Auth0
- Keycloak
- Custom OIDC providers

---

## Database Schema

### Table: `sso_config`
Stores SSO configuration per organization.

```sql
CREATE TABLE "sso_config" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL UNIQUE REFERENCES "organization"("id") ON DELETE CASCADE,
    "enabled" BOOLEAN DEFAULT false,
    "enforced" BOOLEAN DEFAULT false,        -- Block non-SSO login when true
    "protocol" TEXT NOT NULL,                -- 'saml' | 'oidc'

    -- SAML Configuration
    "samlEntityId" TEXT,                     -- IdP Entity ID (issuer)
    "samlSsoUrl" TEXT,                       -- IdP SSO URL
    "samlSloUrl" TEXT,                       -- IdP SLO URL (optional)
    "samlCertificate" TEXT,                  -- IdP X.509 certificate (PEM format)
    "samlSignatureAlgorithm" TEXT DEFAULT 'sha256',
    "samlDigestAlgorithm" TEXT DEFAULT 'sha256',
    "samlWantAssertionsSigned" BOOLEAN DEFAULT true,
    "samlWantMessageSigned" BOOLEAN DEFAULT true,
    "samlNameIdFormat" TEXT DEFAULT 'emailAddress',

    -- OIDC Configuration
    "oidcIssuer" TEXT,                       -- OIDC issuer URL
    "oidcClientId" TEXT,                     -- OIDC client ID
    "oidcClientSecret" TEXT,                 -- Encrypted client secret
    "oidcScopes" TEXT[] DEFAULT ARRAY['openid', 'email', 'profile'],
    "oidcAuthorizationEndpoint" TEXT,        -- Optional override
    "oidcTokenEndpoint" TEXT,                -- Optional override
    "oidcUserInfoEndpoint" TEXT,             -- Optional override

    -- Common Settings
    "allowedDomains" TEXT[] DEFAULT ARRAY[], -- Email domains for SSO
    "autoProvision" BOOLEAN DEFAULT true,    -- JIT user provisioning
    "defaultRole" TEXT DEFAULT 'member',     -- Role for new users
    "attributeMapping" JSONB DEFAULT '{}',   -- Custom attribute mapping

    -- Metadata
    "createdById" TEXT REFERENCES "user"("id"),
    "lastTestedAt" TIMESTAMP,
    "lastLoginAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "sso_config_organizationId_idx" ON "sso_config"("organizationId");
```

### Table: `sso_login_log`
Audit log for SSO login attempts.

```sql
CREATE TABLE "sso_login_log" (
    "id" TEXT PRIMARY KEY,
    "organizationId" TEXT NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
    "email" TEXT NOT NULL,
    "userId" TEXT REFERENCES "user"("id"),   -- NULL if user not found/created
    "protocol" TEXT NOT NULL,                -- 'saml' | 'oidc'
    "success" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "idpResponse" JSONB,                     -- Sanitized IdP response
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "sso_login_log_organizationId_createdAt_idx"
    ON "sso_login_log"("organizationId", "createdAt" DESC);
CREATE INDEX "sso_login_log_email_idx" ON "sso_login_log"("email");
```

### Attribute Mapping Schema
```typescript
interface AttributeMapping {
  // Standard mappings
  email?: string      // Default: 'email' or 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'
  firstName?: string  // Default: 'firstName' or 'given_name'
  lastName?: string   // Default: 'lastName' or 'family_name'
  name?: string       // Default: 'name' or 'displayName'

  // Custom mappings
  department?: string
  title?: string
  employeeId?: string
  groups?: string     // For role assignment
}
```

---

## SAML 2.0 Implementation

### Service Provider (SP) Metadata

OmniDial generates SP metadata for each organization:

**Endpoint:** `GET /api/sso/saml/{organizationSlug}/metadata`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
                     entityID="https://api.omnidial.io/sso/saml/{org_slug}">
  <md:SPSSODescriptor AuthnRequestsSigned="true"
                      WantAssertionsSigned="true"
                      protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">

    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
        <ds:X509Data>
          <ds:X509Certificate>{SP_CERTIFICATE}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>

    <md:NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</md:NameIDFormat>

    <md:AssertionConsumerService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://api.omnidial.io/sso/saml/{org_slug}/acs"
        index="0" isDefault="true"/>

    <md:SingleLogoutService
        Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        Location="https://api.omnidial.io/sso/saml/{org_slug}/slo"/>
  </md:SPSSODescriptor>

  <md:Organization>
    <md:OrganizationName xml:lang="en">OmniDial</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">OmniDial</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">https://omnidial.io</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>
```

### SAML Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│  User   │     │  OmniDial │     │     IdP     │     │  User   │
│ Browser │     │   (SP)      │     │  (Okta,etc) │     │ Account │
└────┬────┘     └──────┬──────┘     └──────┬──────┘     └────┬────┘
     │                 │                    │                 │
     │ 1. Login with SSO                    │                 │
     │ ─────────────>  │                    │                 │
     │                 │                    │                 │
     │                 │ 2. Generate AuthnRequest             │
     │                 │ ──────────────────>│                 │
     │                 │                    │                 │
     │ 3. Redirect to IdP login             │                 │
     │ <─────────────────────────────────── │                 │
     │                 │                    │                 │
     │ 4. Enter credentials                 │                 │
     │ ─────────────────────────────────────>                 │
     │                 │                    │                 │
     │                 │  5. Validate user  │                 │
     │                 │                    │ ───────────────>│
     │                 │                    │ <───────────────│
     │                 │                    │                 │
     │ 6. POST SAMLResponse to ACS          │                 │
     │ <─────────────────────────────────── │                 │
     │ ─────────────>  │                    │                 │
     │                 │                    │                 │
     │                 │ 7. Validate assertion                │
     │                 │ 8. Create/update user                │
     │                 │ 9. Create session                    │
     │                 │                    │                 │
     │ 10. Redirect to dashboard            │                 │
     │ <───────────────│                    │                 │
```

### SAML Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sso/saml/{slug}/metadata` | GET | SP metadata XML |
| `/sso/saml/{slug}/login` | GET | Initiate SAML login |
| `/sso/saml/{slug}/acs` | POST | Assertion Consumer Service |
| `/sso/saml/{slug}/slo` | POST | Single Logout |

### AuthnRequest Generation
```typescript
import { SignedXml } from 'xml-crypto'
import { v4 as uuidv4 } from 'uuid'

function generateAuthnRequest(config: SSOConfig): string {
  const id = `_${uuidv4()}`
  const issueInstant = new Date().toISOString()

  const authnRequest = `
    <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${id}"
        Version="2.0"
        IssueInstant="${issueInstant}"
        Destination="${config.samlSsoUrl}"
        AssertionConsumerServiceURL="https://api.omnidial.io/sso/saml/${config.organizationSlug}/acs"
        ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
      <saml:Issuer>https://api.omnidial.io/sso/saml/${config.organizationSlug}</saml:Issuer>
      <samlp:NameIDPolicy
          Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
          AllowCreate="true"/>
    </samlp:AuthnRequest>
  `

  // Sign the request
  return signXml(authnRequest, config)
}
```

### SAML Response Validation
```typescript
async function validateSamlResponse(
  samlResponse: string,
  config: SSOConfig
): Promise<SamlAssertionResult> {
  // 1. Decode Base64 response
  const xml = Buffer.from(samlResponse, 'base64').toString('utf-8')

  // 2. Verify XML signature using IdP certificate
  const signatureValid = verifyXmlSignature(xml, config.samlCertificate)
  if (!signatureValid) {
    throw new SSOError('INVALID_SIGNATURE', 'SAML response signature verification failed')
  }

  // 3. Parse assertion
  const assertion = parseAssertion(xml)

  // 4. Validate conditions
  validateConditions(assertion, {
    audience: `https://api.omnidial.io/sso/saml/${config.organizationSlug}`,
    notBefore: assertion.conditions.notBefore,
    notOnOrAfter: assertion.conditions.notOnOrAfter,
  })

  // 5. Validate InResponseTo (prevent replay attacks)
  validateInResponseTo(assertion.inResponseTo)

  // 6. Extract attributes
  const attributes = extractAttributes(assertion, config.attributeMapping)

  return {
    nameId: assertion.nameId,
    email: attributes.email,
    firstName: attributes.firstName,
    lastName: attributes.lastName,
    rawAttributes: attributes,
  }
}
```

---

## OIDC Implementation

### OIDC Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│  User   │     │  OmniDial │     │ OIDC Provider│
│ Browser │     │             │     │             │
└────┬────┘     └──────┬──────┘     └──────┬──────┘
     │                 │                    │
     │ 1. Login with SSO                    │
     │ ─────────────>  │                    │
     │                 │                    │
     │ 2. Redirect to authorization endpoint│
     │ <───────────────│                    │
     │ ─────────────────────────────────────>
     │                 │                    │
     │ 3. User authenticates with IdP       │
     │ <────────────────────────────────────│
     │                 │                    │
     │ 4. Redirect with authorization code  │
     │ ─────────────>  │                    │
     │                 │                    │
     │                 │ 5. Exchange code for tokens
     │                 │ ──────────────────>│
     │                 │ <──────────────────│
     │                 │                    │
     │                 │ 6. Fetch user info (optional)
     │                 │ ──────────────────>│
     │                 │ <──────────────────│
     │                 │                    │
     │ 7. Create session, redirect          │
     │ <───────────────│                    │
```

### OIDC Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/sso/oidc/{slug}/login` | GET | Initiate OIDC login |
| `/sso/oidc/{slug}/callback` | GET | Authorization callback |
| `/sso/oidc/{slug}/logout` | GET | Logout and redirect |

### Authorization Request
```typescript
function buildAuthorizationUrl(config: SSOConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.oidcClientId,
    redirect_uri: `https://api.omnidial.io/sso/oidc/${config.organizationSlug}/callback`,
    response_type: 'code',
    scope: config.oidcScopes.join(' '),
    state: state,
    nonce: generateNonce(),
  })

  const authEndpoint = config.oidcAuthorizationEndpoint ||
    `${config.oidcIssuer}/authorize`

  return `${authEndpoint}?${params.toString()}`
}
```

### Token Exchange
```typescript
async function exchangeCodeForTokens(
  code: string,
  config: SSOConfig
): Promise<OIDCTokens> {
  const tokenEndpoint = config.oidcTokenEndpoint ||
    `${config.oidcIssuer}/oauth/token`

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: config.oidcClientId,
      client_secret: decrypt(config.oidcClientSecret),
      redirect_uri: `https://api.omnidial.io/sso/oidc/${config.organizationSlug}/callback`,
    }),
  })

  if (!response.ok) {
    throw new SSOError('TOKEN_EXCHANGE_FAILED', await response.text())
  }

  const tokens = await response.json()

  // Validate ID token
  const claims = await validateIdToken(tokens.id_token, config)

  return {
    accessToken: tokens.access_token,
    idToken: tokens.id_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    claims,
  }
}
```

### ID Token Validation
```typescript
import * as jose from 'jose'

async function validateIdToken(
  idToken: string,
  config: SSOConfig
): Promise<JWTClaims> {
  // Fetch JWKS from IdP
  const jwksUri = `${config.oidcIssuer}/.well-known/jwks.json`
  const JWKS = jose.createRemoteJWKSet(new URL(jwksUri))

  // Verify token
  const { payload } = await jose.jwtVerify(idToken, JWKS, {
    issuer: config.oidcIssuer,
    audience: config.oidcClientId,
  })

  // Validate nonce (prevent replay attacks)
  validateNonce(payload.nonce as string)

  return payload as JWTClaims
}
```

---

## Login Flow Integration

### Email-Based SSO Detection

When a user enters their email on the login page:

```typescript
// Frontend: Check if domain has SSO
async function checkSSOForEmail(email: string): Promise<SSOCheckResult> {
  const domain = email.split('@')[1]
  const response = await fetch(`/api/sso/check?domain=${domain}`)
  return response.json()
}

interface SSOCheckResult {
  hasSSO: boolean
  enforced: boolean          // Must use SSO
  protocol: 'saml' | 'oidc'
  organizationSlug: string
  loginUrl: string           // Direct SSO login URL
}
```

### Login Page UI States

```
┌─────────────────────────────────────┐
│         Welcome to OmniDial       │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Email                       │    │
│  │ user@company.com           ▼│    │
│  └─────────────────────────────┘    │
│                                     │
│  ← SSO detected for company.com     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │    Continue with SSO        │    │  ← Primary action
│  └─────────────────────────────┘    │
│                                     │
│  ─────────── or ───────────         │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Password                    │    │  ← Hidden if SSO enforced
│  │ ••••••••                   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │    Sign in with password    │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

### Enforced SSO Flow

When SSO is enforced, password login is completely disabled:

```typescript
// Backend: Login endpoint
async function handleLogin(email: string, password: string) {
  const domain = email.split('@')[1]
  const ssoConfig = await findSSOConfigByDomain(domain)

  if (ssoConfig?.enforced) {
    throw new AuthError(
      'SSO_REQUIRED',
      'Your organization requires SSO. Please use the SSO login button.'
    )
  }

  // Continue with normal password auth
  return authenticateWithPassword(email, password)
}
```

---

## Just-In-Time (JIT) Provisioning

Automatically create users on first SSO login:

```typescript
async function handleSSOCallback(
  ssoResult: SSOAuthResult,
  config: SSOConfig
): Promise<Session> {
  const { email, firstName, lastName } = ssoResult

  // Check if user exists
  let user = await findUserByEmail(email)

  if (!user && config.autoProvision) {
    // Create new user
    user = await createUser({
      email,
      name: `${firstName} ${lastName}`.trim() || email.split('@')[0],
      emailVerified: true,  // Trusted from IdP
    })

    // Add to organization with default role
    await addMemberToOrganization({
      userId: user.id,
      organizationId: config.organizationId,
      role: config.defaultRole,
    })

    // Log provisioning
    await logSSOEvent('USER_PROVISIONED', { email, organizationId: config.organizationId })
  }

  if (!user) {
    throw new SSOError('USER_NOT_FOUND', 'No account exists for this email')
  }

  // Verify user is member of organization
  const membership = await getMembership(user.id, config.organizationId)
  if (!membership) {
    if (config.autoProvision) {
      await addMemberToOrganization({
        userId: user.id,
        organizationId: config.organizationId,
        role: config.defaultRole,
      })
    } else {
      throw new SSOError('NOT_A_MEMBER', 'You are not a member of this organization')
    }
  }

  // Create session
  return createSession(user.id, config.organizationId)
}
```

---

## Admin Configuration UI

### SSO Settings Page

**Route:** `/dashboard/settings/sso`

```
┌─────────────────────────────────────────────────────────────┐
│  Single Sign-On (SSO)                                       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Enable SSO                                    [ON]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Enforce SSO (disable password login)          [OFF] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Protocol:  ○ SAML 2.0    ● OpenID Connect                  │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  OIDC Configuration                                         │
│                                                             │
│  Issuer URL *                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ https://company.okta.com                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Client ID *                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 0oa1234567890abcdef                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Client Secret *                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ••••••••••••••••••••                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Allowed Email Domains                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ company.com  ×                                      │   │
│  │ subsidiary.com  ×                                   │   │
│  │ + Add domain                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Auto-provision new users                      [ON]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Default role for new users:  [Member ▼]                    │
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Test Connection │  │  Save Settings   │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  Your SSO URLs (share with your IdP admin):                 │
│                                                             │
│  Callback URL:                                              │
│  https://api.omnidial.io/sso/oidc/acme-corp/callback  📋  │
│                                                             │
│  Logout URL:                                                │
│  https://api.omnidial.io/sso/oidc/acme-corp/logout    📋  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### SAML-Specific Configuration

```
┌─────────────────────────────────────────────────────────────┐
│  SAML Configuration                                         │
│                                                             │
│  IdP Entity ID *                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ http://www.okta.com/exk1234567890                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  IdP SSO URL *                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ https://company.okta.com/app/omnidial/sso/saml    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  IdP Certificate *                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ -----BEGIN CERTIFICATE-----                         │   │
│  │ MIIDpDCCAoygAwIBAgIGAX...                           │   │
│  │ -----END CERTIFICATE-----                           │   │
│  └─────────────────────────────────────────────────────┘   │
│  [Upload Certificate] or paste above                        │
│                                                             │
│  ── or ──                                                   │
│                                                             │
│  IdP Metadata URL                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ https://company.okta.com/app/.../sso/saml/metadata │   │
│  └─────────────────────────────────────────────────────┘   │
│  [Import from Metadata]                                     │
│                                                             │
│  ═══════════════════════════════════════════════════════   │
│                                                             │
│  SP Metadata (download for your IdP):                       │
│  [Download Metadata XML]                                    │
│                                                             │
│  Entity ID:                                                 │
│  https://api.omnidial.io/sso/saml/acme-corp           📋  │
│                                                             │
│  ACS URL:                                                   │
│  https://api.omnidial.io/sso/saml/acme-corp/acs       📋  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### File Structure
```
backend/src/
├── api/
│   ├── routes/
│   │   └── sso.ts                 # SSO endpoints
│   └── controllers/
│       └── sso.controller.ts       # SSO handlers
├── services/
│   ├── sso.service.ts             # Core SSO logic
│   ├── saml.service.ts            # SAML-specific logic
│   └── oidc.service.ts            # OIDC-specific logic
├── repositories/
│   ├── ssoConfig.repository.ts
│   └── ssoLoginLog.repository.ts
└── lib/
    └── sso/
        ├── saml.ts                # SAML utilities
        ├── oidc.ts                # OIDC utilities
        └── errors.ts              # SSO error types
```

### API Routes
```typescript
import { Router } from 'express'
import * as ssoController from '@/api/controllers/sso.controller'

const router = Router()

// Public endpoints (no auth required)
router.get('/check', ssoController.checkDomain)
router.get('/saml/:slug/metadata', ssoController.getSamlMetadata)
router.get('/saml/:slug/login', ssoController.initiateSamlLogin)
router.post('/saml/:slug/acs', ssoController.handleSamlCallback)
router.post('/saml/:slug/slo', ssoController.handleSamlLogout)
router.get('/oidc/:slug/login', ssoController.initiateOidcLogin)
router.get('/oidc/:slug/callback', ssoController.handleOidcCallback)
router.get('/oidc/:slug/logout', ssoController.handleOidcLogout)

// Admin endpoints (require org admin)
router.get('/config', requireAuth, requireOrgAdmin, ssoController.getConfig)
router.put('/config', requireAuth, requireOrgAdmin, ssoController.updateConfig)
router.post('/config/test', requireAuth, requireOrgAdmin, ssoController.testConnection)
router.delete('/config', requireAuth, requireOrgAdmin, ssoController.deleteConfig)
router.get('/logs', requireAuth, requireOrgAdmin, ssoController.getLoginLogs)

export default router
```

---

## Security Considerations

### Certificate Management
- Store IdP certificates securely (encrypted at rest)
- Support certificate rotation without downtime
- Validate certificate expiration and warn admins

### Replay Attack Prevention
- Store and validate `InResponseTo` (SAML) and `nonce` (OIDC)
- Use short-lived state tokens
- Enforce timestamp validation (NotBefore/NotOnOrAfter)

### Session Security
- Bind sessions to SSO provider
- Support IdP-initiated logout (SLO)
- Handle session timeout gracefully

### Domain Verification
- Verify ownership of allowed domains (DNS TXT record or email)
- Prevent domain hijacking attacks

---

## Error Handling

### SSO Error Codes
```typescript
type SSOErrorCode =
  | 'INVALID_SIGNATURE'      // Signature verification failed
  | 'EXPIRED_ASSERTION'      // SAML assertion expired
  | 'INVALID_AUDIENCE'       // Wrong SP entity ID
  | 'INVALID_ISSUER'         // Unknown IdP
  | 'TOKEN_EXCHANGE_FAILED'  // OIDC token exchange error
  | 'USER_NOT_FOUND'         // No account for email
  | 'NOT_A_MEMBER'           // Not in organization
  | 'SSO_DISABLED'           // SSO not enabled for org
  | 'DOMAIN_NOT_ALLOWED'     // Email domain not in allow list
  | 'PROVISIONING_DISABLED'  // Auto-provision off, user doesn't exist
```

### User-Friendly Error Page
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                     ⚠️  Login Failed                         │
│                                                             │
│  We couldn't complete your sign-in. This might be because:  │
│                                                             │
│  • Your account doesn't have access to this organization    │
│  • There was a problem with your identity provider          │
│  • The login session expired                                │
│                                                             │
│  Error: SSO_USER_NOT_FOUND                                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │               Try Again                                │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  Need help? Contact your IT administrator or               │
│  support@omnidial.io                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Environment Variables

```env
# SSO Configuration
SSO_SP_PRIVATE_KEY=path/to/sp-private-key.pem
SSO_SP_CERTIFICATE=path/to/sp-certificate.pem

# Session configuration
SSO_STATE_SECRET=random-32-byte-secret-for-state-encryption
SSO_NONCE_TTL=300  # 5 minutes
```

---

## Testing

### SAML Testing Tools
- **samltool.io** - SAML request/response validator
- **Okta Developer** - Free IdP for testing
- **OneLogin SAML Tester** - Validate SP configuration

### OIDC Testing Tools
- **OIDC Debugger** - oauth.tools
- **Keycloak** - Local OIDC server for testing
- **Auth0 Developer** - Free OIDC provider

### Test Scenarios
- [ ] SAML SP-initiated login
- [ ] SAML IdP-initiated login
- [ ] SAML Single Logout
- [ ] OIDC authorization code flow
- [ ] OIDC token refresh
- [ ] JIT user provisioning
- [ ] Enforced SSO (password blocked)
- [ ] Invalid signature handling
- [ ] Expired assertion handling
- [ ] Domain restriction enforcement
