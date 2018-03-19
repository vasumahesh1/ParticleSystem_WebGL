let Noise = require('noisejs').Noise;
const cachedNoise = require('../../config/noise.json');
const simplexNoise = cachedNoise['simplex2d'];
class WeightedRNG {
    constructor(seed) {
        this.weights = {};
        let noise = new Noise(seed);
        this.noiseGen = noise;
        this.seed = seed;
        this.rollItr = 13.0;
        this.totalWeight = 0.0;
    }
    add(key, value) {
        this.weights[key] = value;
        this.totalWeight += value;
    }
    roll() {
        let x = (this.rollItr * this.seed * 13) % simplexNoise['sizeX'];
        let y = (this.rollItr * this.seed * 29) % simplexNoise['sizeY'];
        let noise = simplexNoise['values'][x][y];
        this.rollItr += 19;
        noise = (noise + 1.0) / 2.0;
        let range = noise * this.totalWeight;
        for (let key in this.weights) {
            let weight = this.weights[key];
            if (weight > range) {
                return key;
            }
            range -= weight;
        }
        return undefined;
    }
}
export default WeightedRNG;
//# sourceMappingURL=WeightedRNG.js.map