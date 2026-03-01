from fastapi.testclient import TestClient
from main import app

c = TestClient(app)
login = c.post('/api/v1/auth/login', json={'email':'admin@capdash.io','password':'Admin@123'})
print('login', login.status_code)
h = {'Authorization': f"Bearer {login.json()['access_token']}"}

hosts = c.get('/api/v1/platforms/zabbix/hosts?page=1&limit=5', headers=h)
triggers = c.get('/api/v1/platforms/zabbix/triggers?page=1&limit=5', headers=h)

print('hosts', hosts.status_code)
if hosts.status_code != 200:
    print('hosts_detail', hosts.json().get('detail'))

print('triggers', triggers.status_code)
if triggers.status_code != 200:
    print('triggers_detail', triggers.json().get('detail'))
