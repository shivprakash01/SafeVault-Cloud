const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const redis = require('redis');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const JWT_SECRET = process.env.JWT_SECRET || 'safevault_secret_key_2024';
const MONGO_URI  = process.env.MONGO_URI  || 'mongodb://mongo:27017/safevault';
const REDIS_URL  = process.env.REDIS_URL  || 'redis://redis:6379';

// Redis
let redisClient;
(async () => {
  redisClient = redis.createClient({ url: REDIS_URL });
  redisClient.on('error', (e) => console.log('Redis error:', e.message));
  try { await redisClient.connect(); console.log('Redis connected'); }
  catch (e) { console.log('Redis unavailable'); }
})();

// MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(e => console.log('MongoDB error:', e));

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// ── Serve the Auth UI page ────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>SafeVault – Auth Service</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --bg:#0d0f17;--surface:#141824;--raised:#1c2133;--border:#2a3152;
      --accent:#4f7cff;--green:#22c55e;--red:#ef4444;
      --t1:#f0f4ff;--t2:#8b9bc8;--t3:#505a7a;
      --r:10px;
    }
    body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--t1);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;-webkit-font-smoothing:antialiased}
    .badge{background:#1a2540;border:1px solid var(--border);color:var(--accent);font-size:.72rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;padding:.3rem .8rem;border-radius:20px;margin-bottom:1.25rem;display:inline-block}
    .hero{text-align:center;max-width:580px;margin-bottom:3rem}
    .hero h1{font-size:2.2rem;font-weight:700;letter-spacing:-.5px;margin-bottom:.5rem}
    .hero p{color:var(--t2);font-size:1rem;line-height:1.7}
    .port-tag{display:inline-flex;align-items:center;gap:.4rem;background:var(--raised);border:1px solid var(--border);border-radius:8px;padding:.35rem .9rem;font-family:'DM Mono',monospace;font-size:.85rem;color:var(--accent);margin-top:1rem}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;width:100%;max-width:760px;margin-bottom:2rem}
    .card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.5rem}
    .card h3{font-size:.8rem;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:1.1rem}
    .form-group{margin-bottom:.85rem}
    .form-group label{display:block;font-size:.78rem;font-weight:500;color:var(--t2);margin-bottom:.3rem;text-transform:uppercase;letter-spacing:.04em}
    .form-group input{width:100%;padding:.65rem .9rem;background:var(--raised);border:1px solid var(--border);border-radius:var(--r);color:var(--t1);font-size:.9rem;font-family:inherit;outline:none;transition:border .2s}
    .form-group input:focus{border-color:var(--accent)}
    .btn{width:100%;padding:.7rem;background:var(--accent);color:#fff;border:none;border-radius:var(--r);font-size:.92rem;font-weight:600;font-family:inherit;cursor:pointer;transition:opacity .2s;margin-top:.25rem}
    .btn:hover{opacity:.85}
    .btn.outline{background:transparent;border:1px solid var(--border);color:var(--t1);margin-top:.6rem}
    .result{margin-top:.85rem;padding:.75rem 1rem;border-radius:var(--r);font-size:.82rem;line-height:1.5;display:none}
    .result.ok{background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#86efac;display:block}
    .result.err{background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);color:#fca5a5;display:block}
    .routes-card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:1.5rem;width:100%;max-width:760px;margin-bottom:2rem}
    .routes-card h3{font-size:.8rem;font-weight:600;color:var(--t2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:1rem}
    .route-row{display:flex;align-items:center;gap:.75rem;padding:.6rem 0;border-bottom:1px solid var(--border);font-size:.85rem}
    .route-row:last-child{border-bottom:none}
    .method{font-family:'DM Mono',monospace;font-size:.75rem;font-weight:500;padding:.2rem .55rem;border-radius:5px;min-width:52px;text-align:center}
    .post{background:rgba(79,124,255,.15);color:var(--accent)}
    .get {background:rgba(34,197,94,.15);color:var(--green)}
    .route-path{font-family:'DM Mono',monospace;color:var(--t1);flex:1}
    .route-desc{color:var(--t3);font-size:.8rem}
    .status-row{display:flex;gap:1rem;align-items:center;flex-wrap:wrap;justify-content:center;margin-top:.5rem}
    .status-pill{display:flex;align-items:center;gap:.4rem;font-size:.8rem;color:var(--t2)}
    .dot{width:8px;height:8px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    .link{color:var(--accent);text-decoration:none;font-size:.85rem}
    .link:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="badge">Microservice · Port 8000</div>
  <div class="hero">
    <h1>🔐 Auth Service</h1>
    <p>Handles user registration, login, JWT token generation, and password hashing. Built with Node.js + Express.</p>
    <div class="port-tag">▶ localhost:8000</div>
  </div>

  <div class="grid">
    <!-- Register -->
    <div class="card">
      <h3>Register User</h3>
      <div class="form-group"><label>Name</label><input id="reg-name" placeholder="John Doe"/></div>
      <div class="form-group"><label>Email</label><input id="reg-email" type="email" placeholder="john@example.com"/></div>
      <div class="form-group"><label>Password</label><input id="reg-pass" type="password" placeholder="Min 6 chars"/></div>
      <button class="btn" onclick="doRegister()">Register →</button>
      <div class="result" id="reg-result"></div>
    </div>

    <!-- Login -->
    <div class="card">
      <h3>Login User</h3>
      <div class="form-group"><label>Email</label><input id="log-email" type="email" placeholder="john@example.com"/></div>
      <div class="form-group"><label>Password</label><input id="log-pass" type="password" placeholder="Your password"/></div>
      <button class="btn" onclick="doLogin()">Login →</button>
      <button class="btn outline" onclick="window.open('http://localhost:3000','_blank')">→ Open Full UI (Port 3000)</button>
      <div class="result" id="log-result"></div>
    </div>
  </div>

  <!-- API Routes -->
  <div class="routes-card">
    <h3>Available API Routes</h3>
    <div class="route-row"><span class="method get">GET</span><span class="route-path">/health</span><span class="route-desc">Service health check</span></div>
    <div class="route-row"><span class="method post">POST</span><span class="route-path">/api/auth/register</span><span class="route-desc">Register new user, returns JWT</span></div>
    <div class="route-row"><span class="method post">POST</span><span class="route-path">/api/auth/login</span><span class="route-desc">Login, returns JWT token</span></div>
    <div class="route-row"><span class="method post">POST</span><span class="route-path">/api/auth/verify</span><span class="route-desc">Verify JWT token validity</span></div>
    <div class="route-row"><span class="method post">POST</span><span class="route-path">/api/auth/logout</span><span class="route-desc">Clear session from Redis</span></div>
  </div>

  <div class="status-row">
    <span class="status-pill"><span class="dot"></span> Auth Service Running</span>
    <span style="color:var(--t3);font-size:.8rem">·</span>
    <a class="link" href="/health">Check /health</a>
    <span style="color:var(--t3);font-size:.8rem">·</span>
    <a class="link" href="http://localhost:3000">Frontend (3000)</a>
    <span style="color:var(--t3);font-size:.8rem">·</span>
    <a class="link" href="http://localhost:5000">Upload Service (5000)</a>
  </div>

  <script>
    function show(id, msg, ok) {
      const el = document.getElementById(id);
      el.textContent = msg;
      el.className = 'result ' + (ok ? 'ok' : 'err');
    }

    async function doRegister() {
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-pass').value;
      try {
        const r = await fetch('/api/auth/register', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({name, email, password})
        });
        const d = await r.json();
        if (r.ok) show('reg-result', '✅ Registered! Token: ' + d.token.slice(0,40) + '...', true);
        else show('reg-result', '❌ ' + d.error, false);
      } catch(e) { show('reg-result', '❌ Error: ' + e.message, false); }
    }

    async function doLogin() {
      const email = document.getElementById('log-email').value;
      const password = document.getElementById('log-pass').value;
      try {
        const r = await fetch('/api/auth/login', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({email, password})
        });
        const d = await r.json();
        if (r.ok) show('log-result', '✅ Welcome ' + d.user.name + '! Token: ' + d.token.slice(0,40) + '...', true);
        else show('log-result', '❌ ' + d.error, false);
      } catch(e) { show('log-result', '❌ Error: ' + e.message, false); }
    }
  </script>
</body>
</html>`);
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service', port: 8000, timestamp: new Date() });
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'All fields required' });
    if (await User.findOne({ email }))
      return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({ name, email, password: hashed });
    const token  = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    if (redisClient?.isOpen) await redisClient.setEx(`session:${user._id}`, 604800, token);
    res.status(201).json({ message: 'Registered', token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    if (redisClient?.isOpen) await redisClient.setEx(`session:${user._id}`, 604800, token);
    res.json({ message: 'Login successful', token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/verify', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch { res.status(401).json({ valid: false, error: 'Invalid token' }); }
});

app.post('/api/auth/logout', async (req, res) => {
  if (redisClient?.isOpen && req.body.userId)
    await redisClient.del(`session:${req.body.userId}`);
  res.json({ message: 'Logged out' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`✅ Auth Service running → http://localhost:${PORT}`));
