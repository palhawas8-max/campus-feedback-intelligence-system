"""
e2e_test.py — Full flow integration verification script.
"""
import urllib.request
import json

base = "http://127.0.0.1:8000/api"

def req(path, method="GET", data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data else None
    r = urllib.request.Request(f"{base}{path}", data=body, headers=headers, method=method)
    with urllib.request.urlopen(r) as resp:
        return json.loads(resp.read().decode("utf-8"))

# 1. Health
h = req("/health")
print("1. Health:", h)

import time
unique_email = f"student_{int(time.time())}@jcbose.ac.in"

# 2. Register a new user
new_user = req("/auth/register", "POST", {
    "name": "Integration Student",
    "email": unique_email,
    "password": "testpassword123",
    "role": "student"
})
print("2. Register OK:", new_user["email"])

# 3. Login student
login_res = req("/auth/login", "POST", {"email": unique_email, "password": "testpassword123"})
student_token = login_res["access_token"]
print("3. Student Login OK, role:", login_res["role"])

# 4. Get /me
me = req("/auth/me", token=student_token)
print("4. /auth/me OK:", me["name"])

# 5. Locations
locs = req("/locations", token=student_token)
print(f"5. /locations OK: found {len(locs)} locations")
loc_id = locs[0]["location_id"]

# 6. Submit feedback
survey_res = req("/surveys", "POST", {
    "location_id": loc_id,
    "raw_text": "There is water leakage in the ceiling of Lab 3 and the floor is very slippery",
    "input_mode": "typed"
}, token=student_token)
print("6. /surveys POST OK:")
print("   Urgency:", survey_res["analysis"]["urgency_level"], "| Dept:", survey_res["analysis"]["assigned_dept"])
print("   Ticket #:", survey_res["ticket"]["ticket_id"])
ticket_id = survey_res["ticket"]["ticket_id"]

# 7. My surveys
my_s = req("/surveys/mine", token=student_token)
print(f"7. /surveys/mine OK: count = {len(my_s)}")

# 8. Admin login
admin_res = req("/auth/login", "POST", {"email": "admin@demo.com", "password": "demo1234"})
admin_token = admin_res["access_token"]
print("8. Admin Login OK, role:", admin_res["role"])

# 9. Admin stats
stats = req("/admin/stats", token=admin_token)
print("9. /admin/stats OK:", stats)

# 10. Admin keywords
kws = req("/admin/keywords?days=30", token=admin_token)
print(f"10. /admin/keywords OK: top 3 = {kws[:3]}")

# 11. Admin heatmap
hm = req("/admin/heatmap", token=admin_token)
print(f"11. /admin/heatmap OK: cells = {len(hm)}")

# 12. Admin trends
tr = req("/admin/trends?days=30", token=admin_token)
print(f"12. /admin/trends OK: points = {len(tr)}")

# 13. Admin department distribution
dd = req("/admin/department-distribution", token=admin_token)
print("13. /admin/department-distribution OK:", dd)

# 14. Admin tickets
tix = req("/admin/tickets?page=1&page_size=5", token=admin_token)
print(f"14. /admin/tickets OK: total={tix['total']}, items={len(tix['items'])}")

# 15. Patch ticket status
patch_res = req(f"/admin/tickets/{ticket_id}", "PATCH", {"status": "Resolved"}, token=admin_token)
print(f"15. /admin/tickets/{ticket_id} PATCH OK: status={patch_res['status']}, resolved_at={patch_res['resolved_at']}")

print("\n>>> ALL 15 E2E INTEGRATION CHECKS PASSED SUCCESSFULLY! <<<")
