# Database Reference Fix

Fixed all hardcoded database references from 'PSPD' to 'railway' in production environment.

## Files Modified:
- back-end/routes/post_doc.js
- back-end/server.js  
- back-end/application.js
- back-end/utils/storage.js
- back-end/utils/logger.js
- back-end/db/db.js

This should resolve the `Table 'PSPD.table_document' doesn't exist` errors in Railway logs.

Deployment timestamp: 2025-09-24 06:15 UTC
