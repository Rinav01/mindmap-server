async function testAuth() {
    const rootUrl = "http://localhost:5000/api";
    try {
        console.log("1. Registering new user...");
        const regRes = await fetch(`${rootUrl}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: `testuser_${Date.now()}`,
                email: `test_${Date.now()}@example.com`,
                password: "password123"
            })
        });

        const regData = await regRes.json();
        console.log("Register Response:", regRes.status, regData);

        if (regRes.status !== 201) return;

        const email = regData.email;
        const token = regData.token;

        console.log("\n2. Logging in...");
        const loginRes = await fetch(`${rootUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: "password123"
            })
        });
        const loginData = await loginRes.json();
        console.log("Login Response:", loginRes.status, loginData);

        console.log("\n3. Testing Protected Route WITHOUT token...");
        const failRes = await fetch(`${rootUrl}/mindmaps`);
        console.log("Protected Route (No Token):", failRes.status, await failRes.json());

        console.log("\n4. Testing Protected Route WITH token...");
        const successRes = await fetch(`${rootUrl}/mindmaps`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Protected Route (With Token):", successRes.status, await successRes.json());

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testAuth();
