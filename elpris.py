from requests_cache import CachedSession
from datetime import date, datetime
session = CachedSession('cache', expire_after=3600)

zone = "SE3"
fee = 0.083
vat = 1.25
daytime_start = 12
daytime_end = 20

today = date.today()

def get_price(row):
    return (row['SEK_per_kWh'] + fee) * vat

def get_hour(row):
    return datetime.fromisoformat(row['time_start']).hour

def format_price(row):
    return "{}".format(round(get_price(row) * 100))

base_url = 'https://www.elprisetjustnu.se/api/v1/prices/{date_string}_{zone}.json'
url = base_url.format(date_string=today.strftime("%Y/%m-%d"), zone=zone)

r = session.get(url)
r.status_code

highest = r.json()[0]
lowest = r.json()[0]
lowest_daytime = r.json()[daytime_start]

header = ""
body = ""

print("Date: {}".format(today.strftime("%Y-%m-%d")))

for index, row in enumerate(r.json()):
    header += f"{get_hour(row):02}   "
    body += f"{round(get_price(row) * 100)}".ljust(5, ' ')

    if (index == 11 or index == 23):
        print("Hour: " + header)
        print("Öre:  " + body)
        print()
        header = ""
        body = ""
    
    if row['SEK_per_kWh'] > highest['SEK_per_kWh']:
        highest = row
    
    if row['SEK_per_kWh'] < lowest['SEK_per_kWh']:
        lowest = row
    
    if get_hour(row) >= daytime_start and get_hour(row) <= daytime_end:
        if row['SEK_per_kWh'] < lowest_daytime['SEK_per_kWh']:
            lowest_daytime = row

print()
print("      {:<7} {:<7} {:<7}".format('Lowest', 'Daytime', 'Highest'))
print("Hour: {:02}      {:02}      {:02}".format(get_hour(lowest), get_hour(lowest_daytime), get_hour(highest)))
print("Öre:  {:<4}    {:<4}    {:<4}".format(format_price(lowest), format_price(lowest_daytime), format_price(highest)))
