from functools import cache

ZONE_TABLE = """\
GB: mainland, highlands, islands
DE: north, south
FR: metropolitan, corsica
"""


@cache
def shipping_zones(country):
    """The delivery zones for a country, parsed from ZONE_TABLE."""
    for line in ZONE_TABLE.splitlines():
        code, zones = line.split(":")
        if code == country:
            return tuple(zone.strip() for zone in zones.split(","))
    return ()


def checkout_zones(country, express_available):
    """The zones to offer at checkout, with "express" added when it's available."""
    zones = list(shipping_zones(country))  # our own copy, safe to change
    if express_available:
        zones.append("express")
    return zones
