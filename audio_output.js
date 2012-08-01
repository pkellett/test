
///Real-time audio output.
///Provide the following callback functions:
///
///  audioOutputStart(sampleRate);  <- called when audio output is about to start
///  audioOutputRender(float32array);  <- called when more audio data is needed
///
function AudioOutput(audioOutputStart, audioOutputRender)
{
  var sampleRate = 44100;
  var audioContext = null;

  if(typeof AudioContext == "function")
  {
    audioContext = new AudioContext(); //try Web Audio API
  }
  else if(typeof webkitAudioContext == "function")
  {
    audioContext = new webkitAudioContext(); //didn't exist, so try with prefix
  }

  if(audioContext)
  {
    sampleRate = audioContext.sampleRate;
    audioOutputStart(sampleRate);
    var node = audioContext.createJavaScriptNode(4096, 1, 1);
    node.onaudioprocess = function(event) { audioOutputRender(event.outputBuffer.getChannelData(0)); } //specify callback
    node.connect(audioContext.destination);
  }
  else
  {
    if(typeof Audio == "function") //try Audio Data API
    {
      audioContext = new Audio();
    }
    if(audioContext && typeof audioContext.mozSetup == "function")
    {
      audioContext.mozSetup(1, sampleRate);
      audioOutputStart(sampleRate);

      var prebufferSize = sampleRate / 2;
      var tailPosition, tail = null;
      var writePosition = 0;

      setInterval(function()
      {
        var written;
        if(tail) //Check if some data was not written in previous attempts.
        {
          written = audioContext.mozWriteAudio(tail.subarray(tailPosition));
          writePosition += written;
          tailPosition += written;
          if(tailPosition < tail.length) //Not all the data was written, save the tail...
            return; //... and exit the function.
          tail = null;
        }

        //Check if we need add some data to the audio output.
        var available = audioContext.mozCurrentSampleOffset() + prebufferSize - writePosition;
        if(available & 1) available--; //ensure whole number of frames, if stereo
        if(available > 0) 
        {
          //Render some audio data
          var buffer = new Float32Array(available);
          audioOutputRender(buffer);

          //Write the data
          written = audioContext.mozWriteAudio(buffer);
          if(written < buffer.length) //Not all the data was written, save the tail
          {
            tail = buffer;
            tailPosition = written;
          }
          writePosition += written;
        }
      }, 50);
    }
    else //no audio output, but run the callback anyway
    {
      document.write("<p style='background-color:yellow;'>Your browser does not support real-time audio output. Try Chrome or Firefox.</p>");

      var buffer = new Array(sampleRate / 10);
      setInterval(function() { renderCallback(buffer); }, 100);
    }
  }
}

