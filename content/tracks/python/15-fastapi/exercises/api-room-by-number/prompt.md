Hotel room numbers encode the floor: room 204 is on floor 2, and room 1512 is on floor 15. Add
`GET /rooms/{room_number}` to `app`. It answers with the room number and its floor, both as
integers, and refuses a room number that isn't a whole number with `422`.

```text
GET /rooms/204     ->  200 {"room_number": 204, "floor": 2}
GET /rooms/1512    ->  200 {"room_number": 1512, "floor": 15}
GET /rooms/suite   ->  422
```
