const http = require('http');

function httpRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function main() {
    // Login
    console.log('Logging in...');
    const loginRes = await httpRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'admin123' });

    if (!loginRes.data.token) {
        console.error('Login failed:', JSON.stringify(loginRes.data));
        return;
    }
    const token = loginRes.data.token;
    console.log('Logged in successfully!');

    // Execute draw
    console.log('\nExecuting draw...');
    const execRes = await httpRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/draws/6998a854600d3c15263c2356/execute',
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        }
    }, {});

    console.log('Status:', execRes.status);
    console.log('Response:', JSON.stringify(execRes.data, null, 2));
}

main().catch(e => console.error(e));
