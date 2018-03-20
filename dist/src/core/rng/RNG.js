let Noise = require('noisejs').Noise;
var Logger = require('debug');
var logTrace = Logger("mainApp:rng:trace");
const cachedNoise = require('../../config/noise.json');
const simplexNoise = cachedNoise['simplex2d'];
class RNG {
    constructor(seed, min, max) {
        let noise = new Noise(seed);
        this.noiseGen = noise;
        this.seed = seed;
        this.min = min;
        this.max = max;
        this.rollItr = 232;
    }
    roll(native) {
        let x = (this.rollItr * this.seed * 13) % simplexNoise['sizeX'];
        let y = (this.rollItr * this.seed * 29) % simplexNoise['sizeY'];
        let noise = simplexNoise['values'][x][y];
        this.rollItr += 19;
        noise = (noise + 1.0) / 2.0;
        if (native) {
            noise = Math.random();
        }
        let val = (noise * (this.max - this.min)) + this.min;
        logTrace('RNG Rolled', val);
        return val;
    }
    rollNative() {
        let noise = Math.random();
        let val = (noise * (this.max - this.min)) + this.min;
        logTrace('RNG Rolled', val);
        return val;
    }
}
export default RNG;
//# sourceMappingURL=RNG.js.map