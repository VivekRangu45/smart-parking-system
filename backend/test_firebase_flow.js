const key = 'AIzaSyDA5eXwGsPdBuWLzObz6KUVNbhWjum047A';
const email = 'testuser' + Date.now() + '@example.com';
const password = 'Password123!';

async function test() {
  let idToken = null;
  try {
    console.log('1. Registering user via Firebase REST API...');
    const regRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(JSON.stringify(regData));
    console.log('Registration SUCCESS');

    console.log('\n2. Logging in via Firebase REST API...');
    const loginRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(JSON.stringify(loginData));
    console.log('Login SUCCESS');
    idToken = loginData.idToken;
    console.log('Token generation SUCCESS');

  } catch (err) {
    console.error('Firebase Auth Error:', err.message);
    process.exit(1);
  }

  try {
    console.log('\n3. Testing unauthenticated backend access...');
    const unauthRes = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotId: 1, startTime: '10:00', endTime: '12:00' })
    });
    if (unauthRes.status === 401 || unauthRes.status === 403) {
      console.log('Unauthenticated access blocked: SUCCESS (Status ' + unauthRes.status + ')');
    } else {
      console.error('Unauthenticated access failed to block! Status: ' + unauthRes.status);
    }

    console.log('\n4. Testing authenticated backend access (Token Verification & Booking Creation)...');
    const authRes = await fetch('http://localhost:5000/api/bookings', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ spotId: 1, startTime: '10:00', endTime: '12:00' })
    });
    const authData = await authRes.json();
    if (authRes.ok) {
      console.log('Authenticated access: SUCCESS');
      console.log('Booking creation: SUCCESS (' + JSON.stringify(authData) + ')');
    } else {
      console.error('Authenticated access failed. Status:', authRes.status, authData);
    }
  } catch (err) {
    console.error('Backend Request Error:', err.message);
  }
}

test();
