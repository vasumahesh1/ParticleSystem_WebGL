import { mat4, vec4 } from 'gl-matrix';
import Stack from '../ds/Stack';
let Noise = require('noisejs').Noise;
var Logger = require('debug');
var logTrace = Logger("mainApp:CoreLSystem:trace");
var logError = Logger("mainApp:CoreLSystem:error");
const cachedNoise = require('../../config/noise.json');
const simplexNoise = cachedNoise['simplex2d'];
class LSystemSymbol {
    constructor(val, fn, args) {
        this.value = val;
        this.onProcess = fn;
        this.args = args;
    }
    setValue(val) {
        this.value = val;
        return this;
    }
    setOnProcess(fn) {
        this.onProcess = fn;
        return this;
    }
}
;
class LSystemRule {
    constructor(src, exp, extendFn) {
        this.weight = 1.0;
        this.source = src;
        this.expr = exp;
        this.canExtend = extendFn;
    }
    setWeight(value) {
        this.weight = value;
        return this;
    }
    setSource(value) {
        this.source = value;
        return this;
    }
    setExpr(value) {
        this.expr = value;
        return this;
    }
    setCanExtend(extendFn) {
        this.canExtend = extendFn;
        return this;
    }
}
;
class LSystemRuleSet {
    constructor() {
        this.rules = new Array();
        this.totalWeight = 0.0;
    }
    addRule(src, exp, extendFn) {
        this.rules.push(new LSystemRule(src, exp, extendFn));
        this.totalWeight += 1.0;
    }
    addWeightedRule(src, exp, weight, extendFn) {
        this.rules.push(new LSystemRule(src, exp, extendFn).setWeight(weight));
        this.totalWeight += weight;
    }
}
class LSystemExecutionScope {
    constructor() {
        this.itr = 0;
        this.depth = 1;
        this.stack = new Stack();
        this.turtle = new LSystemTurtle();
    }
    getTurtle() {
        return this.turtle;
    }
    opSaveState() {
        let stackEntry = new LSystemStackEntry(this.turtle);
        this.stack.push(stackEntry);
        logTrace(`Saving State (${this.turtle.position[0]}, ${this.turtle.position[1]}, ${this.turtle.position[2]})`);
    }
    opRestoreState() {
        let stackEntry = this.stack.pop();
        this.turtle = LSystemTurtle.fromExisting(stackEntry.turtle);
        logTrace(`Restoring State (${this.turtle.position[0]}, ${this.turtle.position[1]}, ${this.turtle.position[2]})`);
    }
}
;
class LSystemStackEntry {
    constructor(currentTurtle) {
        this.turtle = LSystemTurtle.fromExisting(currentTurtle);
    }
}
;
class LSystemTurtle {
    constructor() {
        this.position = vec4.fromValues(0, 0, 0, 1);
        this.heading = vec4.fromValues(1, 0, 0, 0);
        this.basePosition = vec4.fromValues(0, 0, 0, 1);
        this.baseHeading = vec4.fromValues(1, 0, 0, 0);
        this.transform = mat4.create();
    }
    applyTransform(m) {
        mat4.multiply(this.transform, this.transform, m);
        vec4.transformMat4(this.position, this.basePosition, this.transform);
        vec4.transformMat4(this.heading, this.baseHeading, this.transform);
        vec4.normalize(this.heading, this.heading);
        logTrace(`Resultant Heading: (${this.heading[0]}, ${this.heading[1]}, ${this.heading[2]})`);
        logTrace(`Resultant Position: (${this.position[0]}, ${this.position[1]}, ${this.position[2]})`);
        logTrace("Resultant Transform:", this.transform);
    }
    applyTransformPre(m) {
        mat4.multiply(this.transform, m, this.transform);
        vec4.transformMat4(this.position, this.basePosition, this.transform);
        vec4.transformMat4(this.heading, this.baseHeading, this.transform);
        vec4.normalize(this.heading, this.heading);
        logTrace(`Resultant Heading: (${this.heading[0]}, ${this.heading[1]}, ${this.heading[2]})`);
        logTrace(`Resultant Position: (${this.position[0]}, ${this.position[1]}, ${this.position[2]})`);
        logTrace("Resultant Transform:", this.transform);
    }
    static fromExisting(src) {
        let copy = new LSystemTurtle();
        vec4.copy(copy.position, src.position);
        vec4.copy(copy.basePosition, src.basePosition);
        vec4.copy(copy.baseHeading, src.baseHeading);
        vec4.copy(copy.heading, src.heading);
        mat4.copy(copy.transform, src.transform);
        return copy;
    }
}
;
class LSystem {
    constructor(seed) {
        this.rules = {};
        this.map = {};
        this.seed = seed;
        let noise = new Noise(seed);
        this.noiseGen = noise;
        this.addSymbol("[", function () {
            this.opSaveState();
            this.depth++;
        }, []);
        this.addSymbol("]", function () {
            this.opRestoreState();
            this.depth--;
        }, []);
    }
    setAxiom(value) {
        this.rootString = new Array();
        for (let i = 0; i < value.length; ++i) {
            this.rootString.push(value[i]);
        }
        this.axiom = value;
        return this;
    }
    addSymbol(value, drawCmd, args) {
        this.map[value] = new LSystemSymbol(value, drawCmd, args);
        return this;
    }
    addRule(src, exp, extendFn) {
        if (!this.rules[src]) {
            this.rules[src] = new LSystemRuleSet();
        }
        this.rules[src].addRule(src, exp, extendFn);
        return this;
    }
    addWeightedRule(src, exp, weight, extendFn) {
        if (!this.rules[src]) {
            this.rules[src] = new LSystemRuleSet();
        }
        this.rules[src].addWeightedRule(src, exp, weight, extendFn);
        return this;
    }
    selectRule(ruleSet, stringItr, itr, generationConstraint) {
        let totalWeight = ruleSet.totalWeight;
        let progress = 0.0;
        if (ruleSet.rules.length == 1) {
            return ruleSet.rules[0];
        }
        let tries = 10;
        let selectedRule = null;
        while (tries >= 0) {
            let noise = this.noiseGen.simplex2(this.seed * stringItr * 13, this.seed * itr * 29);
            noise = (noise + 1.0) / 2.0;
            let ruleIdx = -1;
            let random = Math.random() * totalWeight;
            for (var itr = 0; itr < ruleSet.rules.length; ++itr) {
                let rule = ruleSet.rules[itr];
                progress += rule.weight;
                if (progress > random) {
                    ruleIdx = itr;
                    break;
                }
            }
            if (ruleIdx >= 0) {
                selectedRule = ruleSet.rules[ruleIdx];
                if (selectedRule.canExtend && selectedRule.canExtend(generationConstraint)) {
                    break;
                }
                else if (!selectedRule.canExtend) {
                    break;
                }
                else {
                    selectedRule = null;
                }
            }
            tries--;
        }
        if (!selectedRule) {
            logError('LSystem Failed to Get a Valid Rule for your Productions. Please Check.', ruleSet);
            logError('Defaulting to 0th Index');
            selectedRule = ruleSet.rules[0];
        }
        return selectedRule;
    }
    construct(iterations, generationConstraint) {
        this.setAxiom(this.axiom);
        let current = this.rootString;
        for (let itr = iterations - 1; itr >= 0; --itr) {
            for (let stringItr = 0; stringItr < current.length; ++stringItr) {
                let symbol = current[stringItr];
                let symbolRuleSet = this.rules[symbol];
                if (!symbolRuleSet) {
                    continue;
                }
                current.splice(stringItr, 1);
                let rule = this.selectRule(symbolRuleSet, stringItr, itr, generationConstraint);
                for (let i = 0; i < rule.expr.length; ++i) {
                    current.splice(stringItr + i, 0, rule.expr[i]);
                }
                stringItr += rule.expr.length - 1;
            }
        }
        this.maxDepth = 0;
        let possibleDepth = 0;
        let currentDepth = 0;
        for (let i = 0; i < current.length; ++i) {
            if (current[i] == "[") {
                currentDepth++;
            }
            else if (current[i] == "]") {
                if (possibleDepth < currentDepth) {
                    possibleDepth = currentDepth;
                    currentDepth = 0;
                }
            }
        }
        this.maxDepth = possibleDepth;
        logTrace("Resultant String: " + current);
        logTrace("Resultant Max Depth: ", this.maxDepth);
        return this;
    }
    process(scope) {
        let rootString = this.rootString;
        this.execScope = new LSystemExecutionScope();
        this.execScope.scope = scope;
        this.execScope.rootString = rootString;
        this.execScope.noiseGen = this.noiseGen;
        this.execScope.maxDepth = this.maxDepth;
        for (this.execScope.itr = 0; this.execScope.itr < rootString.length; ++this.execScope.itr) {
            let symbol = rootString[this.execScope.itr];
            let symbolData = this.map[symbol];
            let symbolNext = rootString[this.execScope.itr + 1];
            if (!symbolData) {
                continue;
            }
            let skip = 0;
            let extractedValue = '';
            this.execScope.ruleData = null;
            if (symbolNext == '{') {
                let startItr = this.execScope.itr + 2;
                let valItr = startItr;
                for (; valItr < rootString.length; ++valItr) {
                    let str = rootString[valItr];
                    if (str == '}') {
                        break;
                    }
                    extractedValue += str;
                }
                skip = valItr - startItr + 1;
                this.execScope.ruleData = extractedValue.split(',');
            }
            if (symbolData.onProcess) {
                symbolData.onProcess.apply(this.execScope, symbolData.args);
            }
            this.execScope.itr += skip;
        }
    }
}
;
export default LSystem;
export { LSystem, LSystemTurtle };
//# sourceMappingURL=LSystem.js.map