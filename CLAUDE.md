# Claude Code Session Memory - PagoAutomatico

## Project Context
PagoAutomatico is a payment/ticketing application deployed on Coolify that uses:
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Supabase for data storage and configuration
- **Deployment**: Docker container via Coolify
- **Configuration**: Managed via Supabase `config` table (UUID primary keys)

## Current Objective
Implementing password authentication for application startup using APP_PASSWORD that can be configured via Coolify environment variables.

## Key Architecture Insights Discovered
1. **Configuration Management**: App loads settings from Supabase `config` table, not just environment variables
2. **Database Schema**: `config` table uses UUID primary keys, not integers
3. **Data Flow**: Environment variables are injected by `entrypoint.sh` → `env.js` → app.js, but main config comes from Supabase
4. **Authentication Modal**: Already implemented in HTML/CSS (PR #3 merged)

## Critical Technical Decisions Made

### Storage Strategy
- **Decision**: Store APP_PASSWORD in Supabase config table instead of relying solely on environment variables
- **Rationale**: Consistent with how app manages all other configuration (appTitle, adminCode, securityCode)
- **Implementation**: Add `app_password` column to existing config table

### UUID Handling
- **Issue Encountered**: Initial SQL script failed because config table uses UUID primary keys
- **Solution**: Modified SQL to use `gen_random_uuid()` and `LIMIT 1` instead of `id=1`

### Fallback Strategy
- **Decision**: Primary source = Supabase config, fallback = environment variables
- **Implementation**: `getPasswordFromConfig()` tries Supabase first, then `window.ENV.APP_PASSWORD`

## Files Modified/Created

### Merged Changes
- `index.html`: Added authentication modal HTML structure
- `styles.css`: Added authentication modal styling
- `.env.example`: Added APP_PASSWORD environment variable

### Pending Changes (PR #8)
- `supabase_auth_setup_fixed.sql`: Corrected SQL script for UUID handling
- `auth_supabase_integration_fixed.js`: Complete JavaScript authentication functions
- `SETUP_AUTH_SUPABASE_FIXED.md`: Step-by-step implementation guide

## Current State

### What's Working
- Authentication modal displays correctly
- HTML/CSS structure is complete
- Environment variable injection via entrypoint.sh works
- Supabase connection and data loading functional

### What's Failing
- JavaScript authentication logic not yet implemented
- `APP_PASSWORD` not stored in Supabase config table
- Error: "⚠️ APP_PASSWORD no configurada en las variables de entorno"

### Immediate Next Steps
1. Execute SQL commands in Supabase to add `app_password` field
2. Apply JavaScript changes from `auth_supabase_integration_fixed.js`
3. Test authentication flow

## Development Environment
- **Repository**: https://github.com/xuli70/PagoAutomatico
- **Supabase SQL Editor**: https://stik.axcsol.com/project/default/editor/53984
- **Working Directory**: /home/xuli/PagoAutomatico

## Testing Checklist for Next Session
- [ ] SQL script executes successfully in Supabase
- [ ] Authentication modal appears on app startup
- [ ] Correct password allows access
- [ ] Incorrect password shows error
- [ ] Session persistence works (sessionStorage)
- [ ] Admin panel access requires authentication
- [ ] No more "APP_PASSWORD no configurada" errors

## Useful Commands/URLs
- Supabase Config Query: `SELECT * FROM config LIMIT 5;`
- Test Authentication: Visit app URL after deployment
- Debug Page: `https://domain.com/debug_auth.html` (from PR #6)