# 🧪 Plan de Testare Detaliat - Aplicația Electron EDMS

## 📋 Overview
Plan cuprinzător de testare pentru Electron Sync-Agent cu estimări în story points și prioritizare pe categorii funcționale.

---

## 🎯 **CATEGORIA 1: Authentication & User Management**

### Story #1: User Login & Authentication (5 SP)
**Prioritate: CRITICAL**
- [ ] **Test 1.1**: Login cu credențiale valide
  - Input: Username/password corect
  - Expected: Dashboard se încarcă, user data se salvează în store
  - Verifică: `getUserInfo()` returnează date corecte

- [ ] **Test 1.2**: Login cu credențiale invalide  
  - Input: Username/password greșit
  - Expected: Mesaj de eroare, nu se încarcă dashboard

- [ ] **Test 1.3**: Token expiry handling
  - Simulează token expirat
  - Expected: Re-autentificare automată sau redirect la login

- [ ] **Test 1.4**: User data persistence
  - Login → Close app → Reopen
  - Expected: User rămâne logat, datele se păstrează

### Story #2: Institution Context (3 SP)
**Prioritate: HIGH**
- [ ] **Test 2.1**: Institution ID validation
  - Verifică că toate operațiile folosesc `user.institution_id`
  - Expected: Fiecare query DB include institution_id

- [ ] **Test 2.2**: Cross-institution data isolation
  - Login cu 2 instituții diferite
  - Expected: Datele sunt separate, nu se amestecă

---

## 🔄 **CATEGORIA 2: Real-time Synchronization & WebSocket**

### Story #3: WebSocket Connection Management (8 SP)
**Prioritate: CRITICAL**
- [ ] **Test 3.1**: Initial connection
  - Start app → Check WebSocket status
  - Expected: `socket.connected = true`, subscription success

- [ ] **Test 3.2**: Reconnection after network loss
  - Disconnect internet → Reconnect după 30s
  - Expected: Auto-reconnect cu exponential backoff

- [ ] **Test 3.3**: Connection status indicator
  - Monitor connection în UI
  - Expected: Visual indicator pentru connected/disconnected

- [ ] **Test 3.4**: Event subscription
  - Verifică `socket.emit('subscribe', userData)`
  - Expected: Backend confirmă subscription

### Story #4: Real-time Event Broadcasting (13 SP)
**Prioritate: CRITICAL**
- [ ] **Test 4.1**: Document add events
  - Add document în Electron → Check React frontend
  - Expected: Toast notification + data refresh în React

- [ ] **Test 4.2**: Folder create events
  - Create folder în Electron → Check React
  - Expected: Folder apare instant în React cu toast

- [ ] **Test 4.3**: Move operation events
  - Move document → Check both source și destination
  - Expected: Updates în ambele locații

- [ ] **Test 4.4**: Delete/Restore events
  - Delete → Restore document
  - Expected: Real-time updates pentru recycle bin operations

- [ ] **Test 4.5**: Multiple clients sync
  - 2+ Electron instances + React
  - Expected: Toate primesc events simultaneous

- [ ] **Test 4.6**: Event filtering by path
  - Operations în folder diferit
  - Expected: Doar clientii din folder relevant se updatează

---

## 📁 **CATEGORIA 3: Drag & Drop Operations**

### Story #5: Single File Drag & Drop (5 SP)
**Prioritate: HIGH**
- [ ] **Test 5.1**: PDF file drop în root
  - Drag PDF from desktop → Drop în root folder
  - Expected: File se salvează în root, event emis

- [ ] **Test 5.2**: PDF file drop în subfolder
  - Navigate to subfolder → Drop PDF
  - Expected: File se salvează în subfolder corect

- [ ] **Test 5.3**: Non-PDF file rejection
  - Drop .txt, .jpg files
  - Expected: Error message, files rejected

- [ ] **Test 5.4**: Large file handling
  - Drop file > 50MB
  - Expected: Progress indicator, successful upload sau timeout graceful

### Story #6: Folder Drag & Drop (8 SP)
**Prioritate: HIGH**
- [ ] **Test 6.1**: Folder cu PDF-uri în root
  - Drop folder with multiple PDFs
  - Expected: Folder structure replicată, toate PDF-urile procesate

- [ ] **Test 6.2**: Folder cu PDF-uri în subfolder
  - Navigate to subfolder → Drop folder
  - Expected: Correct path resolution, `window.currentFolderPath` usage

- [ ] **Test 6.3**: Nested folder structure
  - Drop folder cu subfolders și PDF-uri
  - Expected: Entire hierarchy replicată în DB și filesystem

- [ ] **Test 6.4**: Mixed content folder
  - Folder cu PDF + non-PDF files
  - Expected: Doar PDF-urile procesate, others ignored

- [ ] **Test 6.5**: Duplicate handling
  - Drop same folder twice
  - Expected: Conflict resolution sau overwrite prompt

### Story #7: Drop Zone UX (3 SP)
**Prioritate: MEDIUM**
- [ ] **Test 7.1**: Visual feedback
  - Drag over drop zone
  - Expected: Visual highlight, cursor change

- [ ] **Test 7.2**: Drop outside zone
  - Drop file outside designated area
  - Expected: No action, no errors

---

## 🗂️ **CATEGORIA 4: File & Folder Management**

### Story #8: Folder Navigation (5 SP)
**Prioritate: HIGH**
- [ ] **Test 8.1**: Breadcrumb navigation
  - Click breadcrumb items
  - Expected: `window.currentFolderPath` updates correctly

- [ ] **Test 8.2**: Folder tree expand/collapse
  - Click folder icons
  - Expected: Subfolders load, UI updates

- [ ] **Test 8.3**: Deep navigation
  - Navigate 5+ levels deep
  - Expected: Path tracking accurate, back navigation works

- [ ] **Test 8.4**: Refresh folder content
  - Manual refresh after external changes
  - Expected: Latest data loaded

### Story #9: File Operations (8 SP)
**Prioritate: HIGH**
- [ ] **Test 9.1**: File preview
  - Click PDF document
  - Expected: First page preview displays

- [ ] **Test 9.2**: File details
  - View document metadata
  - Expected: Size, date, keywords, tags displayed

- [ ] **Test 9.3**: File move operation
  - Move document between folders
  - Expected: DB updated, physical file moved, events emitted

- [ ] **Test 9.4**: File delete operation
  - Delete document
  - Expected: Moved to recycle bin, DB updated

- [ ] **Test 9.5**: File restore operation
  - Restore from recycle bin
  - Expected: File restored to original location

### Story #10: Search & Filter (5 SP)
**Prioritate: MEDIUM**
- [ ] **Test 10.1**: Document search by name
  - Search for document name
  - Expected: Relevant results returned

- [ ] **Test 10.2**: Search by content/keywords
  - Search extracted text content
  - Expected: Documents with matching content found

- [ ] **Test 10.3**: Filter by date range
  - Apply date filters
  - Expected: Documents within range displayed

- [ ] **Test 10.4**: Filter by folder
  - Filter specific folder content
  - Expected: Only documents from selected folder

---

## 🔧 **CATEGORIA 5: PDF Processing & Metadata**

### Story #11: PDF Text Extraction (8 SP)
**Prioritate: HIGH**
- [ ] **Test 11.1**: Standard PDF processing
  - Upload normal PDF with text
  - Expected: Text extracted, keywords generated

- [ ] **Test 11.2**: Scanned PDF handling
  - Upload image-based PDF
  - Expected: Graceful handling, no crashes

- [ ] **Test 11.3**: Password-protected PDF
  - Upload encrypted PDF
  - Expected: Error handling, user notification

- [ ] **Test 11.4**: Corrupted PDF handling
  - Upload damaged PDF file
  - Expected: Error caught, file rejected gracefully

- [ ] **Test 11.5**: Large PDF processing
  - Upload PDF > 100 pages
  - Expected: Processing completes, performance acceptable

### Story #12: Keyword & Tag Generation (5 SP)
**Prioritate: MEDIUM**
- [ ] **Test 12.1**: Automatic keyword extraction
  - Upload PDF cu text relevant
  - Expected: Top 5 keywords extracted și saved

- [ ] **Test 12.2**: Tag generation from filename
  - Upload file cu nume descriptiv
  - Expected: Tags generated from filename

- [ ] **Test 12.3**: Manual tag addition
  - Add custom tags to document
  - Expected: Tags saved, searchable

---

## 🔗 **CATEGORIA 6: Database Integration**

### Story #13: Data Persistence (8 SP)
**Prioritate: CRITICAL**
- [ ] **Test 13.1**: Document table operations
  - CRUD operations pe `table_document`
  - Expected: All operations successful, data consistent

- [ ] **Test 13.2**: Folder hierarchy integrity
  - Create/delete folder operations
  - Expected: Referential integrity maintained

- [ ] **Test 13.3**: Transaction rollback
  - Simulate failed operation mid-transaction
  - Expected: Database state consistent, no partial updates

- [ ] **Test 13.4**: Connection pooling
  - Multiple simultaneous operations
  - Expected: Connections managed properly, no leaks

### Story #14: Data Migration & Backup (5 SP)
**Prioritate: LOW**
- [ ] **Test 14.1**: Data export functionality
  - Export documents și metadata
  - Expected: Complete data export în format standard

- [ ] **Test 14.2**: Data import validation
  - Import existing data
  - Expected: Data integrity preserved, duplicates handled

---

## 🚨 **CATEGORIA 7: Error Handling & Edge Cases**

### Story #15: Network Error Handling (8 SP)
**Prioritate: HIGH**
- [ ] **Test 15.1**: Backend server down
  - Stop backend server
  - Expected: Graceful error messages, retry mechanism

- [ ] **Test 15.2**: Database connection lost
  - Kill database connection
  - Expected: Operations queued, auto-reconnect

- [ ] **Test 15.3**: WebSocket server unavailable
  - Block WebSocket port
  - Expected: Fallback mechanism, user notification

### Story #16: Resource Management (5 SP)
**Prioritate: MEDIUM**
- [ ] **Test 16.1**: Memory usage under load
  - Process 100+ documents
  - Expected: Memory usage stable, no leaks

- [ ] **Test 16.2**: File handle management
  - Rapid file operations
  - Expected: File handles closed properly

- [ ] **Test 16.3**: Disk space handling
  - Fill up disk space
  - Expected: Graceful error, cleanup mechanism

---

## 🎯 **CATEGORIA 8: Performance & Load Testing**

### Story #17: Performance Benchmarks (13 SP)
**Prioritate: MEDIUM**
- [ ] **Test 17.1**: Startup time
  - Measure app launch to ready state
  - Target: < 5 seconds

- [ ] **Test 17.2**: Large folder loading
  - Load folder cu 1000+ documents
  - Target: < 10 seconds initial load

- [ ] **Test 17.3**: Real-time event latency
  - Measure time from operation to UI update
  - Target: < 2 seconds end-to-end

- [ ] **Test 17.4**: Concurrent operations
  - Multiple drag & drop operations
  - Expected: Queue management, no blocking

---

## 📱 **CATEGORIA 9: UI/UX Testing**

### Story #18: User Interface Validation (8 SP)
**Prioritate: HIGH**
- [ ] **Test 18.1**: Responsive design
  - Test various window sizes
  - Expected: UI adapts properly

- [ ] **Test 18.2**: Theme și styling
  - Check consistent styling
  - Expected: Professional appearance, no broken layouts

- [ ] **Test 18.3**: Accessibility
  - Keyboard navigation
  - Expected: All functions accessible via keyboard

- [ ] **Test 18.4**: Loading states
  - Verify loading indicators
  - Expected: User feedback during operations

### Story #19: Toast Notifications (3 SP)
**Prioritate: MEDIUM**
- [ ] **Test 19.1**: Notification appearance
  - Trigger various events
  - Expected: Appropriate toast colors și messages

- [ ] **Test 19.2**: Notification timing
  - Check auto-dismiss timing
  - Expected: Consistent 5-second display

---

## 🔐 **CATEGORIA 10: Security Testing**

### Story #20: Security Validation (8 SP)
**Prioritate: HIGH**
- [ ] **Test 20.1**: File upload validation
  - Attempt malicious file uploads
  - Expected: Files rejected, no code execution

- [ ] **Test 20.2**: Path traversal protection
  - Try ../ în folder paths
  - Expected: Invalid paths rejected

- [ ] **Test 20.3**: SQL injection prevention
  - Test inputs cu SQL commands
  - Expected: Queries properly parameterized

- [ ] **Test 20.4**: XSS prevention
  - Test HTML/JS în document names
  - Expected: Content properly escaped

---

## 📊 **SUMAR STORY POINTS**

| Categorie | Stories | Total SP | Prioritate |
|-----------|---------|----------|------------|
| Authentication & User Management | 2 | 8 SP | CRITICAL/HIGH |
| Real-time Sync & WebSocket | 2 | 21 SP | CRITICAL |
| Drag & Drop Operations | 3 | 16 SP | HIGH |
| File & Folder Management | 3 | 18 SP | HIGH/MEDIUM |
| PDF Processing & Metadata | 2 | 13 SP | HIGH/MEDIUM |
| Database Integration | 2 | 13 SP | CRITICAL/LOW |
| Error Handling & Edge Cases | 2 | 13 SP | HIGH/MEDIUM |
| Performance & Load Testing | 1 | 13 SP | MEDIUM |
| UI/UX Testing | 2 | 11 SP | HIGH/MEDIUM |
| Security Testing | 1 | 8 SP | HIGH |

**TOTAL: 20 Stories, 134 Story Points**

---

## 🎯 **PLAN DE EXECUȚIE**

### Sprint 1 (CRITICAL - 29 SP)
- Story #3: WebSocket Connection Management (8 SP)
- Story #4: Real-time Event Broadcasting (13 SP) 
- Story #13: Data Persistence (8 SP)

### Sprint 2 (HIGH Priority - 34 SP)
- Story #5: Single File Drag & Drop (5 SP)
- Story #6: Folder Drag & Drop (8 SP)
- Story #8: Folder Navigation (5 SP)
- Story #9: File Operations (8 SP)
- Story #11: PDF Text Extraction (8 SP)

### Sprint 3 (HIGH/MEDIUM - 32 SP)
- Story #1: User Login & Authentication (5 SP)
- Story #2: Institution Context (3 SP)
- Story #15: Network Error Handling (8 SP)
- Story #18: User Interface Validation (8 SP)
- Story #20: Security Validation (8 SP)

### Sprint 4 (MEDIUM/LOW - 39 SP)
- Story #7: Drop Zone UX (3 SP)
- Story #10: Search & Filter (5 SP)
- Story #12: Keyword & Tag Generation (5 SP)
- Story #14: Data Migration & Backup (5 SP)
- Story #16: Resource Management (5 SP)
- Story #17: Performance Benchmarks (13 SP)
- Story #19: Toast Notifications (3 SP)

---

## 🧪 **INSTRUCȚIUNI DE TESTARE**

### Setup de Test:
1. **Environment**: Backend + React + Electron running
2. **Test Data**: Sample PDFs, folders, users
3. **Monitoring**: Console logs, network tab, performance metrics
4. **Documentation**: Screenshot failures, log relevant outputs

### Criteriile de Succes:
- ✅ **Functional**: Feature works as designed
- ✅ **Performance**: Meets performance targets
- ✅ **UX**: Good user experience, clear feedback
- ✅ **Error Handling**: Graceful degradation
- ✅ **Security**: No vulnerabilities exposed

### Raportare Bugs:
- **Severity**: Critical/High/Medium/Low
- **Environment**: OS, versions, config
- **Steps to Reproduce**: Clear reproduction steps
- **Expected vs Actual**: What should happen vs what happens
- **Screenshots/Logs**: Visual proof și relevant logs

**Total Estimated Testing Effort: 134 Story Points (≈ 3-4 weeks for 1 QA engineer)** 