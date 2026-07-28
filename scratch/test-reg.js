async function testRegister() {
  try {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `test_${Date.now()}@zipride.com`,
        phone: `+9199${Math.floor(10000000 + Math.random() * 90000000)}`,
        fullName: 'Test Rider',
        username: null,
        passwordHash: ''
      })
    });
    console.log('Status:', res.status);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testRegister();
