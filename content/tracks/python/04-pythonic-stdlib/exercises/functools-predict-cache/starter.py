from functools import cache


@cache
def shipping_zone(postcode):
    print("looking up", postcode)
    return postcode.split()[0]


for code in ["SW1A 1AA", "M1 1AE", "SW1A 1AA", "M1 1AE", "EH1 1YZ"]:
    zone = shipping_zone(code)

print(zone)
info = shipping_zone.cache_info()
print(info.hits, info.misses)
