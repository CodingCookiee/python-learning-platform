`handle_delivery(event, processed, crm)` is called for every verified webhook delivery. `event`
is the parsed body, `processed` is the set of event ids already handled (a database table in
production), and `crm.create_contact(data)` creates a contact and returns its id.

It returns `"created"` for a new lead and `"ignored"` for event types it doesn't handle. Two
things have gone wrong in production:

1. The form tool retried a slow delivery, and the account manager got the same lead twice:

   ```python
   handle_delivery(event, processed, crm)    # "created"
   handle_delivery(event, processed, crm)    # "created" again, and a second CRM contact
   ```

2. The CRM had a short outage. The form tool retried every failed delivery, but none of those
   leads ever reached the CRM.

Fix both. A delivery whose id has been processed returns `"duplicate"` without calling the CRM.
If the CRM call raises, let the exception propagate (so the endpoint answers `500` and the sender
retries), and make sure the retry does create the contact.
