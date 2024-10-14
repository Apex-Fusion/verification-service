"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const VerificationController_1 = require("../controllers/VerificationController");
const router = express_1.default.Router();
router.get('/scripts', VerificationController_1.listScripts);
router.post('/scripts/:name', VerificationController_1.executeScript);
exports.default = router;
