# Session Authentication Fix

Fixed inconsistent session property references that were causing 401 Unauthorized errors on first document access.

## Problem:
- `/post_docs/document-complete/:documentName` was checking `req.session.user` instead of `req.session.id_user`
- Multiple files used different session property names inconsistently
- This caused documents to fail on first load but work on second attempt

## Files Fixed:
- `back-end/routes/post_doc.js` - Fixed `/document-complete/` endpoint session validation
- `back-end/routes/view.js` - Standardized to use `req.session.id_user`
- `back-end/routes/admin.js` - Standardized to use `req.session.id_user` 
- `back-end/routes/document.js` - Standardized to use `req.session.id_user`

## Result:
- Documents should now load consistently on first attempt
- No more 401 Unauthorized errors for authenticated users
- Consistent session handling across all routes

Deployment timestamp: 2025-09-24 06:20 UTC
