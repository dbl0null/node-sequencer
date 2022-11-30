const { Client } = require('node-osc');
const abletonlink = require('abletonlink');
const firstline = require('firstline');
const readline = require('readline');
const pad = require('pad');
const link = new abletonlink();

let atemClient = {
    'host': '127.0.0.1',
    'port': 3333
};

let synthesiaClient = {
    'host': '127.0.0.1',
    'port': 6000
};

let cameras = [
    {
        "name": "front",
        "osc": "/atem/program/1"
    },
    {
        "name": "push",
        "osc": "/atem/program/2"
    },
    {
        "name": "visual-fx",
        "osc": "/atem/program/3"
    },
//    {
//	"name": "vr",
//	"osc": "/atem/program/5"
//    },
    {
        "name": "supersource",
        "osc": "/atem/program/6000"
    }
];

let vfx = [
    {
        "osc": "/controls/scene-bang-0"
    },
    {
        "osc": "/controls/scene-bang-1"
    },
    {
        "osc": "/controls/scene-bang-2"
    },
    {
        "osc": "/controls/scene-bang-3"
    }
];

let lockCamera = 0; // default camera when a lock file is present
let lockTime = 60; // even when a lockfile is present, if its older than lockTime we ignore\
let lockFile = getLockFilePath(); // lockfile path from the first argument
let lockTimeLeft = 0; // how many seconds left from an active lock (state)

let linkPeers = link.getNumPeers();
let isPlaying = false; // can't query initial state - seems to be there is a bug in the wrapper: https://github.com/2bbb/node-abletonlink/issues/18

let isPaused = false;
let currentCamera = cameras[lockCamera];
let beatCounter = -1;
let status = "";
let rotate = "|/-\\";

function getLockFilePath() {
    const myArgs = process.argv.slice(2);
    let lockFile = "";
    if (myArgs.length >= 1) {
        lockFile = myArgs[0];
    }
    return lockFile;
}

function getRandomCamera() {
    let randomCamera = currentCamera;
    while (randomCamera === currentCamera) {
        randomCamera = cameras[Math.floor(Math.random() * cameras.length)]; 
    }
    return randomCamera;
};

function oscSend(client, message) {
    let status = true;
    try {
        let oscClient = new Client(client.host, client.port);
        oscClient.send(message, '1', (err) => {
            if (err) {
                status = false;
            }
            oscClient.close();
        });
    } catch(error) {
        status = false;
    }
    return status;
}

 function getLockTimeFromFile() {
    if (lockFile === "") {
        return 0;
    }

    firstline(lockFile).then(function(result) {
        let lockTimeStamp = result;
        let currentTimeStamp = Math.floor(Date.now() / 1000);
        let timeDiff = currentTimeStamp - lockTimeStamp;
        lockTimeLeft = Math.max(0, lockTime - timeDiff);
    });
}

function switchToDefaultCamera() {
    currentCamera = cameras[lockCamera];
    atemStatus = oscSend(atemClient, currentCamera.osc);
    return currentCamera;
}

function printStatus(status) {
    process.stdout.write("\r" + pad(status, 100));
}

process.stdout.write("OSC Sequencer\n");
process.stdout.write("Lockfile Path: [" + lockFile + "]\n");

process.stdout.write("Cameras: [");
cameras.forEach(camera => process.stdout.write(" " + camera.name + " "));
process.stdout.write("]\n");


link.enablePlayStateSync();

link.onPlayStateChanged((playState) => {
    isPlaying = playState;
});

readline.emitKeypressEvents(process.stdin);

process.stdin.on('keypress', (ch, key) => {
    if (key && key.name === 'q') {
        link.stopUpdate();
        link.disable();
        process.stdin.pause();
        console.log("\nGoodbye.\n");
        process.exit(0);
    }
    if (key && key.name === 'p') {
        isPaused = !isPaused;
    }
});

process.stdin.setRawMode(true);

link.startUpdate(60, (beat, phase, bpm) => {
    let intBeat = Math.floor(beat);
    let intBpm = Math.round(bpm);
    let intPhase = Math.round(phase);

    if (beatCounter >= intBeat) {
        return;
    }
    beatCounter = intBeat;

    linkPeers = link.getNumPeers();

    if (isPaused) {
        currentCamera = switchToDefaultCamera();
    } else if (linkPeers === 0) {
        // -- No link, we switch to default camera
        currentCamera = switchToDefaultCamera();
    } else {
        getLockTimeFromFile(); 
        if (lockTimeLeft === 0) {
            // no lock, we pick random camera
            if (intBeat % 16 === 0) {
                currentCamera = getRandomCamera();
                atemStatus = oscSend(atemClient, currentCamera.osc);
            }
        } else {
            // lock active, we pick default camera
            if (intBeat % 4 === 0) {
                currentCamera = switchToDefaultCamera();
            }
        }
    }

    synthesiaStatus = oscSend(synthesiaClient, vfx[0].osc);
    if (intBeat % 4 === 0) {
        let randomVfx = Math.floor(Math.random() * 3) + 1; // 1-3
        synthesiaStatus = oscSend(synthesiaClient, vfx[randomVfx].osc);
    }

    rotateCurrent = (intBeat % 4);
    let rotateAnim = rotate[rotateCurrent];

    if (linkPeers === 0) {
        rotateAnim = '-';
        intBpm = 0;
        intPhase = 0;
    }
    status =
        "[" + rotateAnim +"] " + 
        "[BPM: " + intBpm + "] " + 
        "[Phase: " + intPhase + "] " + 
        "[Peers: " + linkPeers + "] " +         
        "[Camera: " + pad(currentCamera.name, 12) + "] " +
        "[Paused: " + isPaused + "] " + 
        "[LockTime: " + lockTimeLeft + "]";
    printStatus(status);
});

link.enable();
