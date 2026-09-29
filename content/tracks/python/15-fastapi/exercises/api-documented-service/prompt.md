The front-desk team is building a screen on top of the hotel's rooms service, and they work from
its OpenAPI docs. The service half works, and its docs say almost nothing. Fix both.

- The app's title is `Rooms API` and its version is `1.0.0`.
- `GET /rooms` returns the list in `ROOMS`, in order. Its summary is `List rooms`.
- `GET /rooms/{room_number}` returns the room with that number, where `room_number` is an integer.
  Its summary is `Look up a room`, and its description (from the function's docstring) is
  `Returns one room by its number.` You can assume the room exists: lesson 4 covers the 404.

```text
GET /rooms       ->  [{"number": 101, "kind": "single", "rate": 90}, ...]
GET /rooms/204   ->  {"number": 204, "kind": "suite", "rate": 240}
GET /rooms/two   ->  422
```

`GET /openapi.json` then shows the title, the version, both paths with their summaries, and an
`integer` path parameter called `room_number`.
