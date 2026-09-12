#!/usr/bin/env bash
# LUXORA API smoke test — exercises the flows the UI actually depends on.
#
#   BASE=http://localhost:4000/api/v1 ./scripts/api-smoke.sh
#
# Design notes:
#  • Booking mutations run against a throwaway hotel created at the start and deleted at
#    the end, so the suite is repeatable and never pollutes the demo catalogue.
#  • Dates are derived from "today + 90 days" so the suite stays valid whenever it runs.
set -uo pipefail
BASE="${BASE:-http://localhost:4000/api/v1}"
PASS=0; FAIL=0
CK=/tmp/luxora-smoke-cookies.txt; rm -f "$CK"

req() { # method path [json] -> "<status> <body>"
  local m="$1" p="$2" body="${3:-}"
  if [ -n "$body" ]; then
    printf '%s ' "$(curl -s -o /tmp/lx.body -w "%{http_code}" -b "$CK" -c "$CK" -X "$m" \
      -H 'Content-Type: application/json' -H "Authorization: Bearer ${TOK:-}" -d "$body" "$BASE$p")"
    cat /tmp/lx.body
  else
    printf '%s ' "$(curl -s -o /tmp/lx.body -w "%{http_code}" -b "$CK" -c "$CK" -X "$m" \
      -H "Authorization: Bearer ${TOK:-}" "$BASE$p")"
    cat /tmp/lx.body
  fi
}

body() { printf '%s' "$1" | sed 's/^[0-9]* //'; }   # strip the "<status> " written by req()
field() { body "$1" | python3 -c "import json,sys;d=json.load(sys.stdin);print(eval('d'+sys.argv[1]))" "$2"; }

check() { # label expected_status "status body"
  local label="$1" expect="$2" out="$3"
  local status="${out%% *}"
  if [ "$status" = "$expect" ]; then
    PASS=$((PASS+1)); printf '  \033[32mok\033[0m   %-48s %s\n' "$label" "$status"
  else
    FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %-48s got %s want %s\n' "$label" "$status" "$expect"
    printf '       %s\n' "$(echo "$out" | cut -d' ' -f2- | head -c 300)"
  fi
}

assert_eq() { # label actual expected
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf '  \033[32mok\033[0m   %-48s %s\n' "$1" "$2"
  else FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %-48s got %s want %s\n' "$1" "$2" "$3"; fi
}

TOK=""
CI=$(date -d "+90 days" +%Y-%m-%d); CO=$(date -d "+93 days" +%Y-%m-%d)   # a 3-night stay

echo "── public catalogue"
check "health"                        200 "$(req GET /health)"
check "hotels list"                   200 "$(req GET '/hotels?limit=4&sort=priceAsc')"
check "hotels filter city+amenity"    200 "$(req GET '/hotels?city=Bali&amenities=spa')"
check "hotels guest capacity filter"  200 "$(req GET '/hotels?city=Bali&guests=5')"
check "hotels price range"            200 "$(req GET '/hotels?minPrice=20000&maxPrice=60000')"
check "hotels sort rating"            200 "$(req GET '/hotels?sort=rating&limit=3')"
check "hotels meta facets"            200 "$(req GET /hotels/meta)"
check "suggest"                       200 "$(req GET '/hotels/suggest?q=ubud')"
check "validation rejects minRating"  422 "$(req GET '/hotels?minRating=9')"
check "unknown slug -> 404"           404 "$(req GET /hotels/does-not-exist)"

OUT=$(req GET '/hotels?limit=1&city=Dubai')
SLUG=$(field "$OUT" "['data'][0]['slug']")
OUT=$(req GET "/hotels/$SLUG"); DETAIL=$(body "$OUT")
HID=$(field "$DETAIL" "['data']['hotel']['_id']")
ROOM=$(field "$DETAIL" "['data']['rooms'][0]['_id']")
RATE=$(field "$DETAIL" "['data']['rooms'][0]['pricePerNight']")
echo "   demo hotel: $SLUG · room $ROOM · ₹$RATE/night"
check "detail returns rooms"          200 "$OUT"
check "review list for hotel"         200 "$(req GET "/reviews/hotel/$HID")"
check "availability for dates"        200 "$(req GET "/hotels/$HID/availability?checkIn=$CI&checkOut=$CO&guests=2")"

echo "── auth"
NEW_EMAIL="smoke+$(date +%s)@luxora.test"
OUT=$(req POST /auth/register "{\"name\":\"Smoke Tester\",\"email\":\"$NEW_EMAIL\",\"password\":\"LuxoraTest#26\",\"confirm\":\"LuxoraTest#26\"}")
check "register"                       201 "$OUT"
check "duplicate email -> 409"         409 "$(req POST /auth/register "{\"name\":\"Smoke Tester\",\"email\":\"$NEW_EMAIL\",\"password\":\"LuxoraTest#26\",\"confirm\":\"LuxoraTest#26\"}")"
check "bad password -> 401"            401 "$(req POST /auth/login "{\"email\":\"$NEW_EMAIL\",\"password\":\"nope-nope-nope\"}")"
check "me without token -> 401"        401 "$(TOK= req GET /auth/me)"
TOK=$(field "$OUT" "['data']['accessToken']")
check "me with token"                  200 "$(req GET /auth/me)"
check "refresh via cookie"             200 "$(req POST /auth/refresh '{}')"
check "update profile"                 200 "$(req PUT /auth/me '{"name":"Smoke Tester II","preferences":{"currency":"USD"}}')"
check "weak password -> 422"           422 "$(req PUT /auth/password '{"currentPassword":"x","newPassword":"y","confirm":"z"}')"
check "user summary"                   200 "$(req GET /users/me/summary)"

echo "── booking engine (isolated fixture property)"
# fixture is created through the admin API, then we hand the guest back their own token
ADMIN_TOK=$(field "$(req POST /auth/login '{"email":"admin@luxora.travel","password":"LuxoraAdmin#26"}')" "['data']['accessToken']")
GUEST_TOK=$TOK
TOK=$ADMIN_TOK
NEW_NAME="Smoke Test Suites $(date +%s)"
OUT=$(req POST /admin/hotels "{\"name\":\"$NEW_NAME\",\"tagline\":\"temporary\",\"description\":[\"Created by the API smoke test to validate availability arithmetic without touching demo data.\"],\"location\":{\"city\":\"Jaipur\",\"country\":\"India\"},\"starRating\":4,\"priceFrom\":9000,\"amenities\":[{\"key\":\"wifi\"},{\"key\":\"pool\"}],\"rooms\":[{\"name\":\"Test Deluxe\",\"roomType\":\"deluxe\",\"description\":\"Room created through the admin API to prove nested writes work.\",\"pricePerNight\":9000,\"maxGuests\":2,\"inventory\":4}]}")
check "admin creates hotel + room"     201 "$OUT"
FHID=$(field "$OUT" "['data']['hotel']['_id']")
FROOM=$(body "$(req GET "/admin/hotels/$FHID/rooms")" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['rooms'][0]['_id'])")
check "admin adds a second room"       201 "$(req POST "/admin/hotels/$FHID/rooms" '{"name":"Test Suite","roomType":"suite","description":"Second room type, added after the property existed, priced at 1.8x the deluxe.","pricePerNight":16200,"maxGuests":3,"inventory":2}')"
check "priceFrom derives from rooms"   200 "$(req GET "/hotels/$FHID")"
TOK=$GUEST_TOK   # back to the traveller: every booking call below must work as a guest
PREVIEW=$(req POST /bookings/preview "{\"roomId\":\"$FROOM\",\"checkIn\":\"$CI\",\"checkOut\":\"$CO\",\"guests\":{\"adults\":2}}")
check "preview totals"                 200 "$PREVIEW"
# hand-computed: 9000*3 = 27000, +12% tax = 3240, + reservation fee 1200
assert_eq "preview math (27000+3240+1200)" "$(field "$PREVIEW" "['data']['quote']['total']")" "31440"
check "past dates -> 422"              422 "$(req POST /bookings/preview "{\"roomId\":\"$FROOM\",\"checkIn\":\"2020-01-01\",\"checkOut\":\"2020-01-04\"}")"
check "out before in -> 422"           422 "$(req POST /bookings/preview "{\"roomId\":\"$FROOM\",\"checkIn\":\"$CO\",\"checkOut\":\"$CI\"}")"
check "max stay enforced -> 422"       422 "$(req POST /bookings/preview "{\"roomId\":\"$FROOM\",\"checkIn\":\"$CI\",\"checkOut\":\"$(date -d '+40 days' -d "$CI" +%Y-%m-%d)\"}")"

BODY="{\"roomId\":\"$FROOM\",\"hotelId\":\"$FHID\",\"checkIn\":\"$CI\",\"checkOut\":\"$CO\",\"guests\":{\"adults\":2,\"children\":0},\"leadGuest\":{\"firstName\":\"Smoke\",\"lastName\":\"Tester\",\"email\":\"$NEW_EMAIL\",\"phone\":\"+91 98200 11122\"},\"specialRequests\":\"High floor please\"}"
OUT=$(req POST /bookings "$BODY"); check "guest creates booking"          201 "$OUT"
BID=$(field "$OUT" "['data']['booking']['_id']")
CREATED="$BID"
CODE=$(field "$OUT" "['data']['booking']['confirmationCode']")
assert_eq "confirmation code format"    "$(printf '%s' "$CODE" | grep -cE '^LX-[A-Z2-9]{6}$')" "1"
assert_eq "server total = 31440"        "$(field "$OUT" "['data']['booking']['total']")" "31440"
assert_eq "nights computed server-side" "$(field "$OUT" "['data']['booking']['nights']")" "3"
echo "   booking $CODE · nights=$(field "$OUT" "['data']['booking']['nights']") · ₹$(field "$OUT" "['data']['booking']['total']")"
check "tampered price -> 409"          409 "$(req POST /bookings "${BODY%?},\"expected\":{\"total\":1}}")"
check "over-capacity -> 409"            409 "$(req POST /bookings "${BODY%?},\"units\":5}")"
check "fills remaining 3 -> 201"        201 "$(req POST /bookings "${BODY%?},\"units\":3}")"
check "sold out -> 409"                 409 "$(req POST /bookings "${BODY%?},\"units\":1}")"
AVAIL=$(body "$(req GET "/hotels/$FHID/availability?checkIn=$CI&checkOut=$CO&guests=2")" \
  | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print([r['remaining'] for r in d['rooms'] if r['roomId']=='$FROOM'][0])")
assert_eq "availability reports 0 left" "$AVAIL" "0"
check "other dates unaffected"          200 "$(req GET "/hotels/$FHID/availability?checkIn=$(date -d "$CO +10 days" +%Y-%m-%d)&checkOut=$(date -d "$CO +13 days" +%Y-%m-%d)&guests=2")"
check "my upcoming trips"               200 "$(req GET '/bookings?scope=upcoming')"
check "get one booking"                 200 "$(req GET "/bookings/$BID")"

SAVED_TOK=$TOK
AS_OTHER=$(req POST /auth/login '{"email":"sofia@reyes.studio","password":"LuxoraGuest#26"}')
TOK=$(field "$AS_OTHER" "['data']['accessToken']")
check "foreign booking read -> 403"     403 "$(req GET "/bookings/$BID")"
check "foreign booking cancel -> 403"   403 "$(req POST "/bookings/$BID/cancel" '{}')"
TOK=$SAVED_TOK
check "cancel own booking"              200 "$(req POST "/bookings/$BID/cancel" '{"reason":"smoke test cleanup"}')"
check "cancel twice -> 409"             409 "$(req POST "/bookings/$BID/cancel" '{}')"
check "cancelled unit returns"          200 "$(req GET "/hotels/$FHID/availability?checkIn=$CI&checkOut=$CO&guests=2")"

echo "── reviews + wishlist"
check "post review"                     201 "$(req POST /reviews "{\"hotelId\":\"$FHID\",\"rating\":5,\"title\":\"Smoke test stay\",\"body\":\"Booked through the API; dates, taxes and totals matched the widget exactly.\",\"travelType\":\"solo\"}")"
check "double review -> 409"            409 "$(req POST /reviews "{\"hotelId\":\"$FHID\",\"rating\":5,\"title\":\"Again\",\"body\":\"Second attempt at the same property, refused by the unique index.\",\"travelType\":\"solo\"}")"
check "review body too short -> 422"    422 "$(req POST /reviews "{\"hotelId\":\"$FHID\",\"rating\":5,\"title\":\"Hi\",\"body\":\"short\"}")"
check "wishlist add"                    201 "$(req POST "/wishlist/$HID")"
check "wishlist list"                   200 "$(req GET /wishlist)"
check "wishlist toggle off"             200 "$(req PATCH "/wishlist/$HID/toggle")"
check "remove missing -> 404"           404 "$(req DELETE "/wishlist/$HID")"
assert_eq "wishlist count after toggle" "$(field "$(req GET /wishlist)" "['data']['count']")" "0"

echo "── authorization"
check "wishlist needs auth"             401 "$(TOK= req GET /wishlist)"
check "admin blocked for guests"        403 "$(req GET /admin/stats)"
OUT=$(req POST /auth/login '{"email":"admin@luxora.travel","password":"LuxoraAdmin#26"}')
check "admin login"                     200 "$OUT"
ADMIN_TOK=$(field "$OUT" "['data']['accessToken']")
TOK=$ADMIN_TOK
OUT=$(req GET /admin/stats); check "media signature (501 when unconfigured)" 501 "$(req POST /media/signature '{"folder":"test"}')"
check "admin stats"                     200 "$OUT"
echo "   $(field "$OUT" "['data']['totals']" | sed "s/'/ /g")"
OUT=$(req GET '/admin/analytics?months=12'); check "admin analytics"        200 "$OUT"
echo "   months with bookings: $(body "$OUT" | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print(sum(1 for s in d['series'] if s['bookings']))")/12 · top city: $(body "$OUT" | python3 -c "import json,sys;d=json.load(sys.stdin)['data']['destinations'];print(d[0]['city'],d[0]['bookings'],'bookings')" 2>/dev/null)
"
check "admin bookings"                  200 "$(req GET '/admin/bookings?limit=5')"
check "admin users"                     200 "$(req GET '/admin/users?limit=5')"
check "admin reviews"                   200 "$(req GET '/admin/reviews?limit=5')"
check "admin hotels"                    200 "$(req GET '/admin/hotels?limit=5')"
check "admin set booking status"        200 "$(req PATCH "/admin/bookings/$BID/status" '{"status":"cancelled"}')"
check "delete hotel with bookings -> 409" 409 "$(req DELETE "/admin/hotels/$FHID")"
check "force delete fixture hotel"      204 "$(req DELETE "/admin/hotels/$FHID?force=true")"
check "fixture gone -> 404"             404 "$(req GET "/hotels/$FHID")"
# teardown: the fixture hotel cascades its rooms; remove our accounts so repeat runs stay tidy
for em in "$NEW_EMAIL" "sofia@reyes.studio"; do :; done
req GET '/admin/users?limit=100&q=smoke' >/dev/null
body "$(req GET '/admin/users?limit=100')" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
ids=[u['id'] for u in d if u['email'].startswith('smoke+')]
print(' '.join(ids))" > /tmp/lx-smoke-users.txt
for uid in $(cat /tmp/lx-smoke-users.txt); do req PATCH "/admin/users/$uid" '{"active":false}' >/dev/null; done
DELETED=$(grep -c . /tmp/lx-smoke-users.txt || true)
echo "   deactivated $DELETED smoke accounts (repeat-run hygiene)"

echo
printf '\033[1m%d passed, %d failed\033[0m\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
