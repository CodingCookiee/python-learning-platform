Tidewater Tours runs the same booking service for two brands: kayak tours (small groups) and the
island ferry (big groups). Each needs its own settings, its own data and its own admin key. Write
`create_app(settings)`, which builds a complete, independent app from a `Settings` (in the starter).

**The app**

- Its OpenAPI title is `settings.service_name`.
- It has its own list of bookings, stored on `app.state`. Two apps never share bookings.
- `CORSMiddleware` allows exactly `settings.allowed_origins`, with the methods `GET` and `POST` and
  the headers `Content-Type` and `X-Admin-Key`.

**Bookings router** (prefix `/bookings`, tag `bookings`)

- `POST /bookings` takes a `BookingCreate`, answers `201` with `{"id": ..., "guest_name": ...,
  "party_size": ...}`. Ids start at 1 in each app. A party bigger than `settings.max_party_size`
  is refused with `422` and the detail `Party size is limited to 6` (with the real limit).
- `GET /bookings` lists that app's bookings.

**Admin router** (prefix `/admin`, tag `admin`)

- Every admin route requires the `X-Admin-Key` header to equal `settings.admin_key`, compared with
  `secrets.compare_digest`. Otherwise: `401`, detail `Admin key required`.
- `GET /admin/stats` answers `{"bookings": <count>, "guests": <total party size>}`.

```python
kayaks = create_app(Settings(service_name="Kayak tours", admin_key="kayak-admin", max_party_size=6,
                             allowed_origins=["https://kayaks.example.com"]))
ferry = create_app(Settings(service_name="Island ferry", admin_key="ferry-admin", max_party_size=40))

POST /bookings (kayaks)  {"guest_name": "Ada", "party_size": 4}    ->  201 {"id": 1, "guest_name": "Ada", "party_size": 4}
POST /bookings (kayaks)  {"guest_name": "Grace", "party_size": 12} ->  422 {"detail": "Party size is limited to 6"}
POST /bookings (ferry)   {"guest_name": "Grace", "party_size": 12} ->  201 {"id": 1, ...}
GET /admin/stats (ferry) X-Admin-Key: kayak-admin                  ->  401
```
