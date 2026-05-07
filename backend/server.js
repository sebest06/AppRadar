const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// In-memory data storage (simulating a DB)
let users = [
    {
        uuid: 'user-123',
        user: 'admin',
        passw: '1234',
        nombre: 'Admin User',
        team: 'Team Alpha',
        uuid_team: 'team-1'
    }
];

let trails = [];
let waypoints = [];
let raceRuns = [];
let tracks = [];

// Auth
app.post('/auth/login', (req, res) => {
    const { user, passw } = req.body;
    const foundUser = users.find(u => u.user === user && u.passw === passw);
    if (foundUser) {
        res.json(foundUser);
    } else {
        res.status(401).send('Invalid credentials');
    }
});

// Trails
app.get('/trails', (req, res) => {
    res.json(trails);
});

app.get('/trails/:trailId/details', (req, res) => {
    const trailId = req.params.trailId;
    const trail = trails.find(t => t.trailUuid === trailId);
    const trailWaypoints = waypoints.filter(w => w.trailUuid === trailId);
    if (trail) {
        res.json({ trail, waypoints: trailWaypoints });
    } else {
        res.status(404).send('Trail not found');
    }
});

// Upload Race Run
app.post('/runs/upload', (req, res) => {
    const run = req.body;
    raceRuns.push(run);
    res.status(200).send('Run uploaded');
});

// Upload Tracks
app.post('/tracks/upload', (req, res) => {
    const newTracks = req.body;
    tracks.push(...newTracks);
    res.status(200).send('Tracks uploaded');
});

// Rankings
app.get('/rankings', (req, res) => {
    const { trailUuid, teamUuid } = req.query;

    // Filter tracks and runs for this trail and team
    // This is a simplified logic for ranking
    const teamUsers = users.filter(u => u.uuid_team === teamUuid);
    const rankings = teamUsers.map(u => {
        const userRun = raceRuns.find(r => r.trailUuid === trailUuid && r.userUuid === u.uuid);
        const userTracks = tracks.filter(t => t.trailUuid === trailUuid && t.runUuid === (userRun?.runUuid || ''));

        return {
            userUuid: u.uuid,
            userName: u.nombre,
            waypointsReached: userTracks.length,
            totalWaypoints: waypoints.filter(w => w.trailUuid === trailUuid).length,
            lastWaypointTime: userTracks.length > 0 ? Math.max(...userTracks.map(t => t.timestamp)) : 0,
            totalTime: userRun?.totalTime || 0,
            isCompleted: userRun?.isCompleted || false
        };
    });

    res.json(rankings.sort((a, b) => {
        if (b.waypointsReached !== a.waypointsReached) return b.waypointsReached - a.waypointsReached;
        return a.lastWaypointTime - b.lastWaypointTime;
    }));
});

app.listen(port, () => {
    console.log(`AppRadar Backend listening at http://localhost:${port}`);
});
