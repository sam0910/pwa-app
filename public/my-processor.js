class MyProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this._bufferSize = 4096;
        this._buffer = new Float32Array(this._bufferSize);
        this._writeIndex = 0;
    }

    process(inputs) {
        const inputChannelData = inputs[0][0];
        if (!inputChannelData) return true;
        for (let i = 0; i < inputChannelData.length; i++) {
            this._buffer[this._writeIndex++] = inputChannelData[i];
            if (this._writeIndex >= this._bufferSize) {
                // Send a full chunk
                const chunk = new Float32Array(this._buffer);
                this.port.postMessage(chunk);
                this._writeIndex = 0;
            }
        }
        // Send partially filled chunk immediately
        if (this._writeIndex > 0) {
            const partial = new Float32Array(this._buffer.subarray(0, this._writeIndex));
            this.port.postMessage(partial);
            this._writeIndex = 0;
        }
        return true;
    }
}

registerProcessor("my-processor", MyProcessor);
