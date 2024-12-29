class AudioStreamProcessor extends AudioWorkletProcessor {
    process(inputs, outputs) {
        const output = outputs[0];
        const input = inputs[0];

        if (input && input.length > 0) {
            for (let channel = 0; channel < output.length; ++channel) {
                output[channel].set(input[channel]);
            }
        }
        return true;
    }
}

registerProcessor("audio-stream-processor", AudioStreamProcessor);
