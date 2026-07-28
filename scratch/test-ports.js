// scratch/test-ports.js

async function test() {
  try {
    const res1 = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'password' })
    });
    console.log('Port 5000 /api/auth/login status:', res1.status);
    try {
      console.log('Port 5000 response:', await res1.json());
    } catch {
      console.log('Port 5000 text:', await res1.text());
    }
  } catch (err) {
    console.log('Port 5000 failed to connect:', err.message);
  }

  try {
    const res2 = await fetch('http://localhost:5000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'password' })
    });
    console.log('Port 5000 /api/v1/auth/login status:', res2.status);
    try {
      console.log('Port 5000 /v1 response:', await res2.json());
    } catch {
      console.log('Port 5000 /v1 text:', await res2.text());
    }
  } catch (err) {
    console.log('Port 5000 /v1 failed to connect:', err.message);
  }
}

test();
