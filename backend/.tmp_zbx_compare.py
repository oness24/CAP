from fastapi.testclient import TestClient
from main import app

c = TestClient(app)
login = c.post('/api/v1/auth/login', json={'email':'admin@capdash.io','password':'Admin@123'})
print('login', login.status_code)
if login.status_code != 200:
    print(login.text)
    raise SystemExit(1)
headers = {'Authorization': f"Bearer {login.json()['access_token']}"}

d = c.get('/api/v1/platforms/zabbix/dashboard', headers=headers)
h = c.get('/api/v1/platforms/zabbix/hosts', params={'page':1,'limit':5}, headers=headers)
t = c.get('/api/v1/platforms/zabbix/triggers', params={'page':1,'limit':5}, headers=headers)

print('dashboard_status', d.status_code)
if d.status_code == 200:
    jd = d.json()['data']
    print('live', jd.get('_live'))
    print('kpi_totalHosts', jd.get('kpis',{}).get('totalHosts',{}).get('value'))

print('hosts_status', h.status_code)
if h.status_code == 200:
    print('hosts_total', h.json().get('total'))

print('triggers_status', t.status_code)
if t.status_code == 200:
    print('triggers_total', t.json().get('total'))
