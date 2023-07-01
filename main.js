let startBtn = null;
let sequenceInput = null;
let lightSequence = "00110011001100110011";
//let lightSequence = "0011";
let lightSequenceArr = [];
let capturedFrames = [];
let shotInterval = null;
let shotNumber = 0;
let maxShots = 0;
let stream = null;
let videoTrack = null;
let body;
let canvas;
let video;
let running = false;
let inputStream = null;
let context = null;
let currentFrame = null;
let output =  null;
const streamWorker = new Worker("encode_worker.js");
const seconds = 10;

const config = {
	codec: "vp8",
	width: 1920,
	height: 1080,
	bitrate: 2_000_000, // 2 Mbps
	framerate: 30,
};



function main() {  
	output = document.getElementById("output");
	if ('VideoEncoder' in window) {
		console.log("WebCodecs API is supported.");
		output.innerHTML = "WebCodecs API is supported. Use Chrome.";
	} else {
		alert("WebCodecs API not supported. Use Chrome.");
		output.html = "WebCodecs API not supported. Use Chrome.";
		return;
	}
	
	startBtn = document.getElementById("startBtn");
	startBtn.onclick = onStartBtn;
	sequenceInput = document.getElementById("sequence");
	body = document.body;
	
	canvas = document.getElementById("theCanvas");
	context = canvas.getContext("2d");
	

	streamWorker.addEventListener('message', function(e) {
		if (e.data.type == "capture" && e.data.frame) {
			capturedFrames.push(e.data.frame);
			if (e.data.stop) end();
		}
		console.log('Worker msg: ' + e.data.text);
	}, false);

	startCameraCapture();
}

function onStartBtn(event) {
	if (running) return;
	startBtn.disabled = true;
	lightSequenceArr = lightSequence.split("");
	maxShots = lightSequenceArr.length;
	shotNumber = 0;
	let deltaTime = seconds * 1000 / maxShots;
	shotInterval = setInterval(takeShot, deltaTime);
	output.innerHTML = "";
}

const captureStream = {
	start() {},
	async transform(chunk, controller) {
		chunk = await chunk;
		currentFrame = chunk;
		constroller.enqueue(chunk);
	},
	flush() {},
}

async function startCameraCapture() {
	stream = await getBetterCameraStream();
	let [track] = stream.getVideoTracks();
	let ts = track.getSettings();
	config.width = ts.width;
	config.height = ts.height;
	const processor = new MediaStreamTrackProcessor(track);
	const generator = new MediaStreamTrackGenerator({kind: 'video'});

	outputStream = generator.writable;
	inputStream = processor.readable;

	streamWorker.postMessage({ type: "stream", config: config, streams: {input: inputStream, output: outputStream}}, [inputStream, outputStream]);
    video = document.getElementById('theVideo');
    video.srcObject =  new MediaStream([generator]);;
	video.play();
	output.innerHTML = "press start";
}

async function getBetterCameraStream() {

	output.innerHTML = "Testing for camera resoultions";
	const devices = await navigator.mediaDevices.enumerateDevices();   
	const videoDevices = devices.filter(device => device.kind === "videoinput");

	let maxWidth = 0;
	let deviceId;
	for (let i = 0; i < videoDevices.length; i++) {
		const device = videoDevices.at(i);		
		const userMedia = await getMediaDevice(device.deviceId);
		output.innerHTML += "<br> " + device.deviceId;
		const track = getTrack(userMedia);
		const width = track.getSettings().width;
		if (width > maxWidth) {
			maxWidth = width;
			deviceId = device.deviceId;
		}
		track.stop();
	}

	return getMediaDevice(deviceId);
}

async function getMediaDevice(deviceId){
	const mediaConstraints = {
		audio: false,
		video: {
			deviceId: deviceId,
			width: { ideal: 4096 },
			height: { ideal: 2160 },
			facingMode: 'user'
		}
	};

	return window.navigator.mediaDevices.getUserMedia(mediaConstraints);
}

function getTrack(device) {
	let [track] = device.getVideoTracks();
	let ts = track.getSettings();
	console.log(`settings ${JSON.stringify(ts)}`);
	return track;
}

async function takeShot() {
	let dark = lightSequenceArr[shotNumber] === "0";
	canvas.style["background-color"] = dark ? "black" : "white";
	
	console.log(`Dark ${dark} maxShots: ${maxShots} shotNumber: ${shotNumber}`);

	shotNumber++;
	streamWorker.postMessage({ type: "capture", stop: shotNumber >= maxShots});
	if (shotNumber >= maxShots) {
		clearInterval(shotInterval);
	}
}

function end() {
	running = false;
	startBtn.disabled = false;
	streamWorker.postMessage({ type: "stop" });
	stream.getTracks().forEach(function(track) {
		track.stop();
	});
	drawFrames();
}

function drawFrames() {
	console.log(`How many frame ${capturedFrames.length}`);
	const sw = window.innerWidth;
	const cols = 5;
	const nw = sw / cols;
	const nh = nw * config.height / config.width;
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	let x, y;
	for (let i = 0; i < capturedFrames.length; i++) {
		x = i * nw % window.innerWidth;
		y = nh * Math.floor(i / cols) ;
		context.drawImage(capturedFrames[i], x , y, nw, nh);
	}
	video.style.display = 'none';
	startBtn.style.display = 'none';
}

function validate(sequence) {
	return false;
}

window.onload = main;
