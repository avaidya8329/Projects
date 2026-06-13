require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'client')));

// All routes → index.html (auth gateway)
// App page is served as /app.html directly
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'client', 'index.html')));
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'client', 'app.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'client', 'terms.html')));
app.get('/callback', (req, res) => res.sendFile(path.join(__dirname, 'client', 'callback.html')));

app.listen(PORT, () => {
  console.log(`PracticeLog running → http://localhost:${PORT}`);
});
