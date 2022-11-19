const { Client } = require('node-osc');
const pad = require('pad');
const abletonlink = require('abletonlink');

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

let currentCamera = 0;
let atemStatus = null;
let synthesiaStatus = null;
let beatCounter = -1;
let status = "";
let rotate = "|/-\\";

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

link.startUpdate(60, (beat, phase, bpm) => {
    let intBeat = Math.floor(beat);
    let intBpm = Math.round(bpm);

    if (beatCounter >= intBeat) {
        return;
    }
    beatCounter = intBeat;

    if (intBeat % 16 === 0) {
        currentCamera = getRandomCamera();
        atemStatus = oscSend(atemClient, currentCamera.osc);
    }


    synthesiaStatus = oscSend(synthesiaClient, vfx[0].osc);
    if (intBeat % 4 === 0) {
        let randomVfx = Math.floor(Math.random() * 3) + 1; // 1-3
        synthesiaStatus = oscSend(synthesiaClient, vfx[randomVfx].osc);
    }

    rotateCurrent = (intBeat % 4);
    status =
        "[" +rotate[rotateCurrent]+"] " + 
        "[BPM: " + intBpm + "] " + 
        "[Camera: " + pad(currentCamera.name, 12) + "] " +
        "[AtemOSC: " + pad(atemStatus, 5) + "] " +
        "[SynthesiaOSC: " + pad(synthesiaStatus, 5) + "]";
    process.stdout.write("\r" + pad(status, 80));
});

