import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'loadtest@example.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'LoadTest1!';

export const options = {
    stages: [
        { duration: '30s', target: 20  },  // ramp up to 20 users
        { duration: '30s', target: 50  },  // ramp up to 50 users
        { duration: '30s', target: 100 },  // ramp up to 100 users
        { duration: '2m',  target: 100 },  // hold at 100 users
        { duration: '30s', target: 0   },  // ramp down
    ],
    thresholds: {
        http_req_failed:   ['rate<0.01'],        // <1% errors
        http_req_duration: ['p(95)<500'],        // 95% of requests under 500ms
    },
};

const TEST_URLS = [
    'https://www.google.com/search?q=load+testing',
    'https://www.github.com/trending/javascript',
    'https://www.wikipedia.org/wiki/Load_testing',
    'https://www.stackoverflow.com/questions/tagged/nodejs',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
];

// runs once per VU before the test starts
export function setup() {
    // ensure test account exists
    http.post(`${BASE_URL}/auth/register`, JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    }), { headers: { 'Content-Type': 'application/json' } });

    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    }), { headers: { 'Content-Type': 'application/json' } });

    const token = res.json('accessToken');
    if (!token) throw new Error(`Login failed: ${res.body}`);
    return { token, tokenFetchedAt: Date.now() };
}

export default function (data) {
    let { token, tokenFetchedAt } = data;

    // refresh token if it's been over 14 minutes
    if (Date.now() - tokenFetchedAt > 14 * 60 * 1000) {
        const res = http.post(`${BASE_URL}/auth/refresh`, null, {
            headers: { 'Content-Type': 'application/json' },
        });
        const newToken = res.json('accessToken');
        if (newToken) {
            data.token = newToken;
            data.tokenFetchedAt = Date.now();
            token = newToken;
        }
    }

    const url = TEST_URLS[Math.floor(Math.random() * TEST_URLS.length)];

    // shorten a URL
    const shortenRes = http.post(`${BASE_URL}/shorten`, JSON.stringify({ url }), {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
    });

    check(shortenRes, {
        'shorten status 201': (r) => r.status === 201,
        'has shortUrl':       (r) => r.json('shortUrl') !== undefined,
    });

    // if successful, hit the redirect endpoint
    if (shortenRes.status === 201) {
        const code = shortenRes.json('code');
        const redirectRes = http.get(`${BASE_URL}/${code}`, {
            redirects: 0, // don't follow redirect, just check it responds
        });
        check(redirectRes, {
            'redirect status 302': (r) => r.status === 302,
        });
    }

    sleep(1);
}
