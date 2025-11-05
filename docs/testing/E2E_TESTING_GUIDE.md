# End-to-End Testing Guide - Real-World Authentication & Focus Mode

**Date:** November 4, 2025  
**Purpose:** Validate the complete user flow with real Google OAuth authentication

---

## 📋 Prerequisites

### 1. Environment Setup
```bash
# Start both servers (should already be running)
# Backend on port 4001
# Frontend on port 3000

# Verify ports
lsof -i :3000 -i :4001

# Expected output:
# node    59049 knight   17u  IPv6 ... TCP *:hbci (LISTEN)      # Frontend
# node    60615 knight   26u  IPv6 ... TCP *:newoak (LISTEN)    # Backend
```

### 2. Test Accounts
Create 2 Google test accounts:
- Account A: `test.user.a@gmail.com` (or similar)
- Account B: `test.user.b@gmail.com` (or similar)

### 3. Supabase Configuration
Verify in Supabase dashboard:
- Project URL: `https://xxxxxx.supabase.co`
- Anon key configured
- Google OAuth provider enabled
- Redirect URL: `http://localhost:3000/auth/callback`

### 4. Database Status
```bash
# Check database connection
curl -s http://localhost:4001/health/detailed | jq .

# Expected: database status should be "ok"
```

---

## 🧪 Test Scenarios

### Scenario 1: Single Device, Single Account (Baseline)

**Objective:** Verify basic focus session creation, tracking, and completion

**Steps:**

1. **Open Application**
   ```
   Browser: Chrome
   URL: http://localhost:3000
   Expected: Home page loads, "Sign in with Google" button visible
   ```

2. **Sign In with Google**
   ```
   Click: "Sign in with Google"
   Enter: Account A credentials (test.user.a@gmail.com)
   Expected: Redirected to /chat page
   Verify: User profile shows email in top right
   Check DevTools Network: POST /auth/callback should return JWT token
   ```

3. **Create Document**
   ```
   Click: "Upload Document" button
   Select: Any PDF or image file
   Wait: For OCR processing (check backend logs)
   Expected: Document appears in chat sidebar
   ```

4. **Start Focus Mode**
   ```
   In Chat: Click "Start Focus Mode" button
   Expected: 
   - Focus mode bar appears at top (gradient background)
   - Timer shows "00:00:00"
   - Status shows "🎯 Focus Mode"
   - Check Backend Logs: POST /focus/sessions should succeed
   - Check DevTools: Request has "Authorization: Bearer <token>"
   ```

5. **Verify Session Created**
   ```
   Backend Console: Look for:
   "[FocusController] Creating session for user..."
   Check database query result - verify userId = current user's UUID
   Frontend Console: Check no errors
   ```

6. **Simulate Activity**
   ```
   Timer running: Wait 10 seconds (should show 00:00:10)
   Note: This is real elapsed time tracking
   ```

7. **Simulate Distraction**
   ```
   Action: Switch to another browser tab
   Expected:
   - Focus mode bar might show visual change
   - Check Backend Logs: POST /focus/sessions/:id/distractions
   - Distraction count should increment in header
   Return: Back to focus mode tab
   ```

8. **Complete Session**
   ```
   Click: "✓ Complete" button
   Modal: Appears asking for work proof
   Upload: Select a file (JPEG/PNG/PDF)
   Mood: Click one emoji mood selector
   Notes: Add optional notes
   Click: "Complete Session" button
   
   Expected:
   - Modal shows "✅ Session completed successfully!"
   - Redirects to /focus/report/[sessionId]
   - Check Backend: POST /focus/sessions/:id/complete logs
   ```

9. **View Session Report**
   ```
   Page: /focus/report/[sessionId] loads
   Expected to see:
   - Focus Score: (100 - distractions*5)
   - Grade: Calculated from score
   - Session duration
   - Distraction count
   - Timeline of events
   - Mood emoji selected
   ```

10. **Verify in Sessions List**
    ```
    Navigate: /focus/sessions
    Expected:
    - Session appears in table
    - Status: "Completed" (green badge)
    - Score and grade visible
    - Click "View Report" links to report page
    ```

**Success Criteria:**
- ✅ Session created successfully
- ✅ Bearer token used in all API calls
- ✅ Distraction logged
- ✅ Session completed
- ✅ Report shows correct data

---

### Scenario 2: Cross-Device Data Consistency

**Objective:** Verify same user account sees identical data across devices

**Setup:** Keep Chrome open with Account A signed in

**Steps:**

1. **Note Session in Chrome**
   ```
   Browser 1 (Chrome): 
   Navigate: http://localhost:3000/focus/sessions
   Count: How many sessions shown? (e.g., 5 sessions)
   Note: First session ID
   Store: Session IDs in notepad
   ```

2. **Open Firefox with Same Account**
   ```
   Browser 2 (Firefox):
   URL: http://localhost:3000
   Click: "Sign in with Google"
   Enter: Same Account A (test.user.a@gmail.com)
   Expected: Same user profile shown in Firefox
   ```

3. **Verify Sessions Visible in Firefox**
   ```
   Browser 2 (Firefox):
   Navigate: /focus/sessions
   Expected:
   - Same session list as Chrome
   - Same session count (e.g., 5 sessions)
   - Same session IDs
   - Same scores/grades/status
   ```

4. **Check Specific Session Details**
   ```
   Both Browsers:
   Click: Same session from step 1
   Navigate: /focus/report/[sessionId]
   Compare: 
   - Focus score matches
   - Distractions count matches
   - Grade matches
   - Timestamp matches
   ```

5. **Create New Session in Firefox**
   ```
   Browser 2 (Firefox):
   Create: New document upload
   Start: Focus mode
   Wait: 5 seconds
   Complete: Session with file upload
   ```

6. **Verify New Session in Chrome**
   ```
   Browser 1 (Chrome):
   Refresh: /focus/sessions page
   Expected: New session created in Firefox now visible in Chrome
   Verify: Same data (score, status, etc.)
   ```

7. **Sign Out and Verify Data Gone**
   ```
   Browser 1 (Chrome):
   Click: Logout/Sign Out button
   Refresh: /focus/sessions
   Expected: 
   - Redirected to login page
   - Sessions no longer visible
   
   Browser 2 (Firefox):
   Verify: Sessions still visible (logged in as Account A)
   ```

**Success Criteria:**
- ✅ Both browsers show identical session list
- ✅ Session details match exactly
- ✅ New session visible across browsers immediately (after refresh)
- ✅ Sign out clears data in one browser only

---

### Scenario 3: Data Isolation Between Accounts

**Objective:** Verify users cannot access other users' sessions (security)

**Setup:** Account A already has sessions; Account B is new

**Steps:**

1. **Create Sessions in Account A**
   ```
   Browser: Chrome (Account A)
   Create: 2-3 focus sessions
   Note: Session IDs (e.g., "session-uuid-1")
   Navigate: /focus/sessions
   Count: Sessions visible = 3
   ```

2. **Sign In as Account B**
   ```
   Browser: Firefox
   Navigate: http://localhost:3000
   Sign in: With Account B (test.user.b@gmail.com)
   Navigate: /focus/sessions
   Expected: No sessions visible (count = 0)
   ```

3. **Try Direct URL Access to Account A's Session**
   ```
   Browser: Firefox (Account B)
   URL: /focus/report/session-uuid-1 (from step 1)
   Expected:
   - Page shows: "Session Not Found"
   - No data revealed about Account A's session
   - Check DevTools: GET /focus/sessions/:id returns 404
   ```

4. **Verify API Authorization**
   ```
   Browser: Firefox (Account B)
   Open DevTools
   Go to Network tab
   Manually test:
   
   curl -X GET http://localhost:4001/focus/sessions/session-uuid-1 \
     -H "Authorization: Bearer <AccountB's-token>"
   
   Expected Response:
   - Status: 404 Not Found (doesn't reveal why)
   OR
   - Status: 403 Forbidden (if endpoint returns permission denied)
   
   Backend Logs: Should show permission check failure
   ```

5. **Verify Account A's Sessions Still Intact**
   ```
   Browser: Chrome (Account A)
   Refresh: /focus/sessions
   Expected: Original 3 sessions still visible
   ```

**Success Criteria:**
- ✅ Account B cannot see Account A's sessions
- ✅ Direct URL access to Account A's session returns error
- ✅ API returns proper error codes (404 or 403)
- ✅ No data leakage about other user's sessions

---

### Scenario 4: Backend Authorization Validation

**Objective:** Test API security at the HTTP level

**Prerequisites:**
```bash
# 1. Get valid tokens from browser
# In Chrome DevTools:
# 1. Open Application/Cookies
# 2. Look for Supabase auth token in localStorage
# 3. Or check Network tab for Authorization header

# 2. Extract Account A's token
AccountA_Token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# 3. Extract Account B's token
AccountB_Token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Steps:**

1. **Test Valid Request with Token**
   ```bash
   # Request with valid Account A token
   curl -X GET http://localhost:4001/focus/sessions \
     -H "Authorization: Bearer $AccountA_Token" \
     -H "Content-Type: application/json"
   
   Expected:
   - Status: 200 OK
   - Body: { data: [...sessions], total: N }
   - Only Account A's sessions in data
   ```

2. **Test Missing Authorization Header**
   ```bash
   # Request without token
   curl -X GET http://localhost:4001/focus/sessions
   
   Expected:
   - Status: 401 Unauthorized
   - Body: { statusCode: 401, message: "Unauthorized" }
   ```

3. **Test Invalid Token**
   ```bash
   # Request with fake token
   curl -X GET http://localhost:4001/focus/sessions \
     -H "Authorization: Bearer invalid.token.here"
   
   Expected:
   - Status: 401 Unauthorized
   - Body error message
   ```

4. **Test Cross-User Access**
   ```bash
   # Get Account A's session ID
   Session_ID="abc123def456"
   
   # Try accessing with Account B's token
   curl -X GET http://localhost:4001/focus/sessions/$Session_ID \
     -H "Authorization: Bearer $AccountB_Token"
   
   Expected:
   - Status: 404 Not Found
   - OR Status: 403 Forbidden
   - Body: { statusCode: 404/403, message: "Not Found" or "Forbidden" }
   ```

5. **Test Token Expiration (if applicable)**
   ```
   Wait: For Supabase token to expire (or manually expire)
   Request: With expired token
   Expected:
   - Status: 401 Unauthorized
   - Body: Expired token error
   ```

**Success Criteria:**
- ✅ Valid token allows access to own resources
- ✅ Missing token returns 401
- ✅ Invalid token returns 401
- ✅ Cross-user access returns 404 or 403
- ✅ Expired token returns 401

---

### Scenario 5: Data Persistence & State Management

**Objective:** Verify session state persists correctly across navigation

**Steps:**

1. **Create Session**
   ```
   Browser: Chrome
   Navigate: /chat
   Create: Focus session
   Note: Session ID from backend
   ```

2. **Navigate Away and Back**
   ```
   Click: Home button
   Navigate: Back to /chat
   Expected:
   - Session still active
   - Timer continues counting
   - sessionIdRef still has value
   ```

3. **Refresh Page During Session**
   ```
   Page: /chat (with active focus session)
   Refresh: Browser F5
   Expected:
   - Session continues (backend persists)
   - Timer resets to 0 (frontend state lost)
   - Backend still knows about session
   - Can still log distractions to same session
   ```

4. **Check Database**
   ```bash
   # Connect to database and verify
   SELECT * FROM focus_sessions 
   WHERE id = '[session-uuid]' 
   AND userId = '[current-user-uuid]';
   
   Expected:
   - Session record exists
   - status = 'active' or 'paused'
   - startedAt has timestamp
   - userId matches current user
   ```

**Success Criteria:**
- ✅ Session persists after page navigation
- ✅ Session accessible after page refresh
- ✅ Database shows correct user ownership
- ✅ Multiple refreshes don't create duplicate sessions

---

## 📊 Testing Checklist

### Authentication
- [ ] Google OAuth login works
- [ ] JWT token received
- [ ] Token stored in localStorage/auth context
- [ ] Token attached to API requests (Authorization header)
- [ ] User UUID created/retrieved correctly
- [ ] Token validation works (invalid token = 401)
- [ ] Token expiration handled
- [ ] Sign out clears token

### Session Creation
- [ ] POST /focus/sessions with token succeeds (200)
- [ ] Session record created in database
- [ ] Session has userId = current user
- [ ] Session has startedAt timestamp
- [ ] Session status = 'active'
- [ ] sessionIdRef populated on frontend

### Distraction Logging
- [ ] POST /focus/sessions/:id/distractions succeeds (200)
- [ ] Distraction record created with correct sessionId
- [ ] Tab switch detected correctly
- [ ] Duration calculated correctly
- [ ] Distraction count incremented on frontend

### Session Completion
- [ ] POST /focus/sessions/:id/complete succeeds (200)
- [ ] Session status changes to 'completed'
- [ ] Final metrics calculated
- [ ] Focus score calculated: 100 - (distractions * 5)
- [ ] Grade assigned: A/B/C/D/F
- [ ] Timestamp set for completedAt

### Session Retrieval
- [ ] GET /focus/sessions/:id returns session data (200)
- [ ] GET /focus/sessions/:id/analytics returns analytics (200)
- [ ] GET /focus/sessions returns paginated list (200)
- [ ] Only user's own sessions returned
- [ ] Pagination works correctly
- [ ] Filter by status works

### Data Isolation
- [ ] User A cannot see User B's sessions
- [ ] Cross-user API calls return 404/403
- [ ] Database queries filtered by userId
- [ ] No data leakage in error messages

### Frontend UI
- [ ] Focus mode bar shows correctly
- [ ] Timer counts up in real-time
- [ ] Pause/resume works
- [ ] Complete button triggers modal
- [ ] Modal accepts file upload
- [ ] Modal shows mood selector
- [ ] Sessions list page loads
- [ ] Sessions list displays correct data
- [ ] Pagination navigation works
- [ ] Report page loads session details
- [ ] Report shows correct metrics

### Performance
- [ ] Session creation < 500ms
- [ ] Distraction logging < 200ms
- [ ] Session list load < 1s
- [ ] Report page load < 1s
- [ ] Pagination doesn't lag

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized on API calls

**Symptoms:**
```
GET /focus/sessions
Status: 401
Body: { statusCode: 401, message: "Unauthorized" }
```

**Solutions:**
1. Check token in browser localStorage
   ```javascript
   // In browser console
   localStorage.getItem('supabase.auth.token')
   ```
2. Verify token in Authorization header
   ```javascript
   // In Network tab, check request headers
   Authorization: Bearer eyJhbGc...
   ```
3. Check Supabase configuration
   ```bash
   # In backend .env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_KEY=xxxxx
   ```
4. Verify token signature
   ```javascript
   // Decode token at jwt.io
   // Check: sub claim = user UUID
   // Check: exp claim > current timestamp
   ```

---

### Issue: 404 Not Found on session access

**Symptoms:**
```
GET /focus/sessions/abc-123-def
Status: 404
Body: { statusCode: 404, message: "Not Found" }
```

**Solutions:**
1. Verify session exists in database
   ```sql
   SELECT * FROM focus_sessions WHERE id = 'abc-123-def';
   ```
2. Verify session ownership
   ```sql
   SELECT userId FROM focus_sessions WHERE id = 'abc-123-def';
   -- Should match JWT sub claim
   ```
3. Check API route parameters
   ```bash
   curl -v http://localhost:4001/focus/sessions/abc-123-def \
     -H "Authorization: Bearer $TOKEN"
   # Check request URL is correct
   ```

---

### Issue: Sessions not visible after refresh

**Symptoms:**
- Session exists in database
- Sessions not showing in /focus/sessions list
- Other browsers show the session

**Solutions:**
1. Check token refresh
   ```javascript
   // In browser console
   supabase.auth.getSession()
   ```
2. Check query parameters
   ```bash
   # Verify pagination limit
   GET /focus/sessions?limit=10&offset=0
   ```
3. Check time zone issues
   ```javascript
   // Verify startedAt timestamp
   new Date(session.startedAt).toISOString()
   ```

---

### Issue: File upload fails in modal

**Symptoms:**
- Modal appears
- File selected
- Click submit -> error

**Solutions:**
1. Check file size
   ```bash
   # Max 10MB
   ls -lh [file]
   ```
2. Check file type
   ```bash
   # Allowed: JPEG, PNG, PDF
   file [file]
   ```
3. Check backend logs
   ```bash
   # Look for upload errors
   tail -f /apps/api/logs
   ```

---

## 📈 Performance Benchmarks

Target metrics for success:
- JWT validation: < 10ms
- Session creation: < 100ms
- Distraction logging: < 50ms
- Session list query: < 200ms (with pagination)
- Report calculation: < 100ms

**To measure:**
```bash
# Backend: Enable request timing
# Add in FocusController:
console.time(`[${req.method}] ${req.path}`)
// ... endpoint logic
console.timeEnd(`[${req.method}] ${req.path}`)

# Frontend: Use Performance API
performance.mark('session-create-start')
// ... create session
performance.mark('session-create-end')
performance.measure('session-create', 'session-create-start', 'session-create-end')
```

---

## ✅ Final Verification Checklist

Before marking Phase 1 complete:

- [ ] All 5 test scenarios pass
- [ ] No 401/403/404 errors in happy path
- [ ] Data consistency across browsers verified
- [ ] Data isolation between accounts verified
- [ ] API authorization validation passed
- [ ] All frontend pages load without errors
- [ ] All API endpoints accept valid tokens
- [ ] All API endpoints reject invalid tokens
- [ ] Database contains correct user records
- [ ] No console errors in browser
- [ ] No errors in backend logs
- [ ] Performance meets targets

---

## 📞 Support & Debugging

### Enable Debug Logging

**Backend:**
```bash
# Add debug flag
DEBUG=nest:* npm run start:prod

# Or enable in code
console.debug('SupabaseAuthGuard validating token:', token)
```

**Frontend:**
```javascript
// Add to useFocusSession
console.debug('Calling API:', method, endpoint, token)
const response = await apiFetch(endpoint, { method, body })
console.debug('Response:', response)
```

### Capture Network Requests

**Chrome DevTools:**
1. Open DevTools (F12)
2. Go to Network tab
3. Filter: `focus` or `sessions`
4. Check each request:
   - Headers: Authorization present?
   - Payload: Correct data?
   - Response: Status 200?

### Check Database

**Supabase Dashboard:**
1. Go to SQL Editor
2. Run: `SELECT * FROM focus_sessions ORDER BY startedAt DESC LIMIT 10`
3. Verify:
   - userId = current user's UUID
   - startedAt is recent
   - status = 'completed' or 'active'

---

**Last Updated:** November 4, 2025  
**Version:** 1.0  
**Status:** Ready for Testing ✅
