import { queue } from 'async';
var Loader = require('webgl-obj-loader');
var Logger = require('debug');
var logTrace = Logger("mainApp:assetLibrary:trace");
var logError = Logger("mainApp:assetLibrary:error");
class AssetLibrary {
    constructor() {
        this.meshes = {};
        this.queue = queue(this.loadAsset, 4);
    }
    loadAsset(task, callback) {
        logTrace(`Loading Mesh from URL: ${task.url} as name: ${task.key}`);
        Loader.downloadMeshes({ mesh: task.url }, function (meshes) {
            if (!meshes.mesh || meshes.mesh.vertices.length == 0) {
                logError('Empty Mesh Found at: ' + task.url);
                callback('EMPTY_MESH');
                return;
            }
            task.ref.meshes[task.key] = meshes.mesh;
            callback();
        });
    }
    load(assets) {
        let ref = this;
        return new Promise(function (resolve, reject) {
            ref.queue.drain = function () {
                logTrace('All Assets Loaded');
                resolve();
            };
            for (let key in assets) {
                let url = assets[key];
                let payload = {};
                payload.key = key;
                payload.url = url;
                payload.ref = ref;
                ref.queue.push(payload, function (err) {
                    if (!err) {
                        return;
                    }
                    logError('Error Loading Object', err);
                    ref.queue.kill();
                    reject(err);
                });
            }
        });
    }
}
export default AssetLibrary;
//# sourceMappingURL=AssetLibrary.js.map