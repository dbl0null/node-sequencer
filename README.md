# Minimal NodeJS based sequencer

### NodeJS Sequencer with Ableton Link to control Atem + Synthesia

* Automatically synchronizes tempo with [Ableton Link](https://www.ableton.com/en/link/) on the local network
* Controls [AtemOSC](https://github.com/SteffeyDev/atemOSC) to switch cameras (in sync with BPM)
* Controls [Synesthesia](https://synesthesia.live) effects through OSC (in sync with BPM)
* Added support for lockfile -> If lockfile present with a timestamp in it, and the difference is less than lockTIme (60s by default), then it will switch to the default camera (lockCamera), instead of sequencing. Once the lock Time is passed, sequencing will resume. 
* Minimal status report on command line

#### How to use:

```
npm ci
node sequencer.js
```
