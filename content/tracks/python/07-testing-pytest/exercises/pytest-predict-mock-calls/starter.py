from unittest.mock import Mock

gateway = Mock()
gateway.charge.return_value = {"id": "ch_1042", "status": "succeeded"}

print(gateway.charge(1999, "GBP")["status"])
gateway.charge(500, "GBP")
print(gateway.charge.call_count)
print(gateway.charge.call_args)

gateway.refund("ch_1042")
print(gateway.method_calls)
print(type(gateway.anything_at_all).__name__)

send_email = Mock(side_effect=[True, ConnectionError("SMTP server down")])
print(send_email("ada@example.com"))
try:
    send_email("grace@example.com")
except ConnectionError as error:
    print("failed:", error)

send_email.assert_called_with("grace@example.com")
print("checked the last call")
