When a customer reports "my order failed", support needs to find that exact request in the logs.
Add a middleware to the order service that gives every request an id:

- If the request has an `X-Request-ID` header that matches `VALID_ID` (8 to 64 letters, digits and
  hyphens), keep it: it came from the load balancer or the calling service, and keeping it links
  their logs to yours.
- Otherwise (missing, too short, or full of odd characters) generate a new one with
  `uuid.uuid4().hex`.
- Store it on `request.state.request_id`, where `GET /orders/{order_id}` already reads it.
- Send it back in the `X-Request-ID` response header, on **every** response, including `404`s and
  `422`s.

```text
GET /orders/A1042   X-Request-ID: lb-7f3a9c21        ->  200, X-Request-ID: lb-7f3a9c21,
                                                          {"order_id": "A1042", "request_id": "lb-7f3a9c21"}
GET /orders/A1042   (no header)                      ->  200, X-Request-ID: <32 hex characters>
GET /nowhere        X-Request-ID: <script>           ->  404, X-Request-ID: <a new id>
```
