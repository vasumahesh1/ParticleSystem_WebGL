import { vec2, vec3, vec4 } from 'gl-matrix';
import { Building, Property, GenerationConstraint } from './Building';
import RNG from '../rng/RNG';
var Logger = require('debug');
var logTrace = Logger("mainApp:CityGenerator:trace");
var logError = Logger("mainApp:CityGenerator:error");
let Noise = require('noisejs').Noise;
const cachedNoise = require('../../config/noise.json');
const populationNoise = cachedNoise['positive_noise_1'];
const simplex2D = cachedNoise['simplex2d'];
function getRandom2D(x, y) {
    x = Math.floor(x % simplex2D['sizeX']);
    y = Math.floor(y % simplex2D['sizeY']);
    let rng = simplex2D['values'][x][y];
    return rng;
}
class CityGenerator {
    constructor(seed) {
        this.seed = seed;
        let noise = new Noise(seed);
        this.noiseGen = noise;
        this.properties = new Array();
        this.blueprints = new Array();
    }
    fbm2D(p, octaves) {
        let s = 0.0;
        let m = 0.0;
        let a = 0.5;
        for (let i = 0; i < octaves; i++) {
            s += a * this.noiseGen.perlin2(p[0], p[1]);
            m += a;
            a *= 0.5;
            vec2.scale(p, p, 2.0);
        }
        return s / m;
    }
    populationNoise(p) {
        let x = p[0] % populationNoise['sizeX'];
        let y = p[1] % populationNoise['sizeY'];
        let noiseVal = populationNoise['values'][x][y];
        return noiseVal > 0 ? noiseVal : -noiseVal;
        // return (this.fbm2D(p, 8) + 1.0) / 2.0;
    }
    canPlaceProperty(property) {
        for (var idx = this.properties.length - 1; idx >= 0; idx--) {
            let prop = this.properties[idx];
            if (prop.checkOverlap(property)) {
                return false;
            }
        }
        return true;
    }
    debugProperty(property) {
        let localPosition = property.getEdgeVertex();
        let finalPosition = vec4.create();
        vec4.add(finalPosition, this.rootTranslate, localPosition);
        let tempVec1 = vec4.create();
        let tempVec2 = vec4.create();
        vec4.add(tempVec1, finalPosition, vec4.fromValues(property.sideLength, 0, 0, 0.0));
        vec4.add(tempVec2, finalPosition, vec4.fromValues(property.sideLength, 0, property.sideLength, 0.0));
        logTrace(`Property Edges at: ${finalPosition[0]}, ${finalPosition[1]}, ${finalPosition[2]}`);
        logTrace(`Property Edges at: ${tempVec1[0]}, ${tempVec1[1]}, ${tempVec1[2]}`);
        this.debugLines.add(finalPosition, tempVec1);
        logTrace(`Property Edges at: ${tempVec2[0]}, ${tempVec2[1]}, ${tempVec2[2]}`);
        this.debugLines.add(tempVec1, tempVec2);
        vec4.add(tempVec1, finalPosition, vec4.fromValues(0, 0, property.sideLength, 0.0));
        logTrace(`Property Edges at: ${tempVec1[0]}, ${tempVec1[1]}, ${tempVec1[2]}`);
        this.debugLines.add(tempVec2, tempVec1);
        this.debugLines.add(tempVec1, finalPosition);
    }
    constructProperty(property, constraint) {
        logTrace(`Constructing Property at: ${property.center[0]}, ${property.center[1]}, ${property.center[2]}`);
        this.properties.push(property);
        let localPosition = property.getEdgeVertex();
        let finalPosition = vec4.create();
        vec4.add(finalPosition, this.rootTranslate, localPosition);
        this.debugProperty(property);
        logTrace(`Constructing Starting Point at: ${finalPosition[0]}, ${finalPosition[1]}, ${finalPosition[2]}`);
        let selectedBlueprints = [];
        for (var itr = 0; itr < this.blueprints.length; ++itr) {
            let current = this.blueprints[itr];
            let result = false;
            if (current.config.constraints.population < constraint.population.min) {
                result = true;
            }
            if (result) {
                selectedBlueprints.push(result);
            }
        }
        if (selectedBlueprints.length == 0) {
            logError('Unable to Find a Valid Blueprint for given Constraints');
            return;
        }
        let random = (getRandom2D(this.seed * property.center[0] * 31, this.seed * property.center[2] * 729) + 1.0) / 2.0;
        let idx = Math.floor(random * selectedBlueprints.length);
        logTrace('Blueprint Selected IDX', idx);
        this.blueprints[idx].construct(finalPosition, this.grammarSystem, constraint, property);
        logTrace('Constructed a Plot');
    }
    build(width, height, rootTranslate) {
        this.properties = new Array();
        this.blueprints = new Array();
        this.rootTranslate = rootTranslate;
        let propertySizeRng = new RNG(4231, 1, 5);
        for (let itr = 0; itr < this.buildingBlueprints.buildings.length; ++itr) {
            let building = this.buildingBlueprints.buildings[itr];
            this.blueprints.push(new Building(building, this.buildingComps, this.roofMesh));
            // testBuilding.construct(vec4.fromValues(0,0,0,1), this.grammarSystem);
        }
        for (var coordX = 0; coordX < width; ++coordX) {
            for (var coordZ = 0; coordZ < height; ++coordZ) {
                let coordVec2 = vec2.fromValues(coordX, coordZ);
                let populationLevel = this.populationNoise(coordVec2);
                let constraint = new GenerationConstraint();
                constraint.setPopulation(populationLevel, 1.0);
                // constraint.setPopulation(0.0, 1.0);
                constraint.setLandValue(0.0, 1.0);
                let val = Math.round(propertySizeRng.roll('native'));
                let potentialProperty = new Property(val * 30);
                potentialProperty.setCenter(vec3.fromValues(coordVec2[0], 0, coordVec2[1]));
                if (!this.canPlaceProperty(potentialProperty)) {
                    continue;
                }
                this.constructProperty(potentialProperty, constraint);
            }
        }
    }
}
export default CityGenerator;
//# sourceMappingURL=CityGenerator.js.map