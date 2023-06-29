'use strict';

let encoder, decoder, pl, started = false, stopped = false;


let frameCounter = 0;


async function init() {
    const initEncoder = {
        output: handleChunk,
        error: (e) => {
            console.log(e.message);
        },
    };
    
    const configEncoder = {
        codec: "vp8",
        width: 640,
        height: 480,
        bitrate: 2_000_000, // 2 Mbps
        framerate: 30,
    };
    
    const { supported } = await VideoEncoder.isConfigSupported(configEncoder);
    
    if (supported) {
        encoder = new VideoEncoder(initEncoder);
        encoder.configure(configEncoder);
    }
    
    
    const initDecoder = {
        output: handleFrame,
        error: (e) => {
          console.log(e.message);
        },
      };
      
      const configDecoder = {
        codec: "vp8",
        codedWidth: 640,
        codedHeight: 480,
      };
      
      const { supportedDecoder } = await VideoDecoder.isConfigSupported(configDecoder);
      if (supportedDecoder) {
        decoder = new VideoDecoder(initDecoder);
        decoder.configure(configDecoder);
      }     
}



self.addEventListener('message', async function(e) {
    if (stopped) return;

    let type = e.data.type;
  
    if (type == "stop") {
      self.postMessage({text: 'Stop message received.'});
      return;
    } else if (type == "frame"){
    //   self.postMessage({severity: 'fatal', text: 'Invalid message received.'});
      self.postMessage({text: 'Frame received'});
      encoder.encode(frame, { keyFrame: true });
      return;
    }
  }, false);

  function handleChunk(chunk, metadata) {

    // actual bytes of encoded data
    const chunkData = new Uint8Array(chunk.byteLength);
    chunk.copyTo(chunkData);

    decoder.decode(chunk);
  }

  function handleFrame(frame) {
    self.postMessage({frame: frame, text: "New decoded frame"});
  }

  init();