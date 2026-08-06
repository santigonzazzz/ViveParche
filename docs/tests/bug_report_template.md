# Bug Report Template

## Bug ID
[Auto-generated or manual ID]

## Severity
- [ ] **Critical** - System crash, data loss, security vulnerability
- [ ] **High** - Major feature broken, no workaround
- [ ] **Medium** - Feature partially broken, workaround available
- [ ] **Low** - Minor issue, cosmetic problem

## Priority
- [ ] **P0** - Fix immediately
- [ ] **P1** - Fix in current sprint
- [ ] **P2** - Fix in next sprint
- [ ] **P3** - Fix when possible

## Summary
[Brief one-line description of the bug]

## Environment
- **Backend Version**: [e.g., 1.0.0]
- **Python Version**: [e.g., 3.11.0]
- **OS**: [e.g., Windows 11, Ubuntu 22.04]
- **Database**: [e.g., Supabase PostgreSQL]
- **Frontend** (if applicable): [e.g., Next.js 14.0.0]

## Steps to Reproduce
1. [First step]
2. [Second step]
3. [Third step]
...

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Screenshots/Logs
```
[Paste relevant error logs, stack traces, or screenshots]
```

## API Request/Response (if applicable)
**Request:**
```json
{
  "endpoint": "/events/",
  "method": "POST",
  "body": {}
}
```

**Response:**
```json
{
  "status_code": 500,
  "detail": "Error message"
}
```

## Root Cause Analysis
[If known, describe the root cause]

## Proposed Fix
[If known, describe how to fix it]

## Integration Impact
- [ ] Backend only
- [ ] Frontend only
- [ ] Backend-Frontend integration
- [ ] Database schema
- [ ] External API (OpenAI, Supabase)

## Related Issues
- [Link to related bugs or features]

## Additional Notes
[Any other relevant information]

---

## Example Bug Report

### Bug ID
BUG-001

### Severity
- [x] **High** - Major feature broken, no workaround

### Priority
- [x] **P1** - Fix in current sprint

### Summary
Event creation allows past dates, violating business rule

### Environment
- **Backend Version**: 1.0.0
- **Python Version**: 3.11.0
- **OS**: Windows 11
- **Database**: Supabase PostgreSQL

### Steps to Reproduce
1. Send POST request to `/events/`
2. Include `event_date` with a past date (e.g., "2020-01-01T10:00:00")
3. Observe that the event is created successfully

### Expected Behavior
The API should return a 422 Unprocessable Entity error with a validation message stating that event dates must be in the future.

### Actual Behavior
The event is created successfully with a past date, allowing business owners to post invalid events.

### API Request/Response
**Request:**
```json
{
  "title": "Past Event",
  "description": "This should fail",
  "municipality_id": "123e4567-e89b-12d3-a456-426614174000",
  "owner_id": "123e4567-e89b-12d3-a456-426614174001",
  "event_date": "2020-01-01T10:00:00",
  "location_address": "Test Location",
  "price": 10.0
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174002",
  "title": "Past Event",
  "event_date": "2020-01-01T10:00:00",
  "created_at": "2026-01-29T16:00:00"
}
```

### Root Cause Analysis
The `EventCreate` Pydantic model in `app/models/event.py` does not include a validator to check that `event_date` is in the future.

### Proposed Fix
Add a Pydantic validator to the `EventCreate` model:

```python
from pydantic import field_validator

@field_validator('event_date')
@classmethod
def validate_future_date(cls, v):
    if v and v < datetime.utcnow():
        raise ValueError('Event date must be in the future')
    return v
```

### Integration Impact
- [x] Backend only
- [ ] Frontend only
- [ ] Backend-Frontend integration

### Related Issues
None

### Additional Notes
This is a critical business rule that should be enforced at the API level to prevent invalid data entry.
