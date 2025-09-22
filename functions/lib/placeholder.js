"use strict";
if (k2 === undefined)
    k2 = k;
var desc = Object.getOwnPropertyDescriptor(m, k);
if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
    desc = { enumerable: true, get: function () { return m[k]; } };
}
Object.defineProperty(o, k2, desc);
(function (o, m, k, k2) {
    if (k2 === undefined)
        k2 = k;
    o[k2] = m[k];
});
;
Object.defineProperty(o, "default", { enumerable: true, value: v });
function (o, v) {
    o["default"] = v;
}
;
var ownKeys = function (o) {
    ownKeys = Object.getOwnPropertyNames || function (o) {
        var ar = [];
        for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k))
                ar[ar.length] = k;
        return ar;
    };
    return ownKeys(o);
};
return function (mod) {
    if (mod && mod.__esModule)
        return mod;
    var result = {};
    if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
            if (k[i] !== "default")
                __createBinding(result, mod, k[i]);
    __setModuleDefault(result, mod);
    return result;
};
();
Object.defineProperty(exports, "__esModule", { value: true });
exports.startDocParse = void 0;
const functions = __importStar(require("firebase-functions"));
exports.startDocParse = functions.https.onCall(async (data, context) => {
    // placeholder callable to keep deployment happy; replace with real logic later
    return { ok: true, placeholder: true };
});
//# sourceMappingURL=placeholder.js.map