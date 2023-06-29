let startBtn = null;
let sequenceInput = null;
let lightSequence = "00110011001100110011";
let lightSequenceArr = [];
let econdedFrames = [];
let shotInterval = null;
let shotNumber = 0;
let maxShots = 0;
let stream = null;
let videoTrack = null;
let body;
let running = false;
let inputStream = null;
let streamWorker = null;
let processor = null;
const seconds = 10;



function main() {  
	startBtn = document.getElementById("startBtn");
	startBtn.onclick = onStartBtn;
	sequenceInput = document.getElementById("sequence");
	body = document.body;
	streamWorker = new Worker("encode_worker.js");

	streamWorker.addEventListener('message', function(e) {
		console.log('Worker msg: ' + e.data.text);
	}, false);

	startCameraCapture();
}

function onStartBtn(event) {
	if (running) return;
	console.log(`on start ${sequenceInput.value}`);
	startBtn.disabled = true;
	lightSequenceArr = lightSequence.split("");
	maxShots = lightSequenceArr.length;
	shotNumber = 0;
	let deltaTime = seconds * 1000 / maxShots;
	shotInterval = setInterval(takeShot, deltaTime);
}

async function startCameraCapture() {
	stream = await getBetterCameraStream(); 
	let [track] = stream.getVideoTracks();
	let ts = track.getSettings();
	processor = new MediaStreamTrackProcessor(track);
	

	 const generator = new MediaStreamTrackGenerator({kind: 'video'});
	 outputStream = generator.writable;

    let video = document.getElementById('theVideo');
    video.srcObject =  new MediaStream([generator]);;
	video.play()	
}

async function getBetterCameraStream() {
	const devices = await navigator.mediaDevices
		.enumerateDevices();   
	
	const videoDevices = devices.filter(device => device.kind === "videoinput");
	videoDevices.forEach((device) => {	
		console.log(`${device.kind}: ${device.label} id = ${device.deviceId}`);
	});
	const device = videoDevices.at(videoDevices.length - 1);
	const mediaConstraints = {
		audio: false,
		video: {deviceId: device.deviceId}
		
	};

	return window.navigator.mediaDevices.getUserMedia(mediaConstraints);
}

async function takeShot() {
	let dark = lightSequenceArr[shotNumber] === "0";
	body.style["background-color"] = dark ? "black" : "white";
	inputStream = processor.readable;
	console.log(`Dark ${dark} maxShots: ${maxShots} shotNumber: ${shotNumber} inputStream: ${inputStream.getReader()}`);
	const reader = inputStream.getReader();
	//const result = await reader.read();
	// const frame = result.value;
	// streamWorker.postMessage({ type: "frame", frame: frame });
	// shotNumber++;
	if (shotNumber >= maxShots) {
		end();
	}
}

function end() {
	clearInterval(shotInterval);
	running = false;
	startBtn.disabled = false;
	streamWorker.postMessage({ type: "stop" });
}

function validate(sequence) {
	return false;
}

window.onload = main;
