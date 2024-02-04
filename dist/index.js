"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var prompts_1 = require("@inquirer/prompts");
var fs_1 = require("fs");
var askQuestions = function () { return __awaiter(void 0, void 0, void 0, function () {
    var filePath, bossName, playerName, spellName, dmgModifier;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, prompts_1.input)({ message: "Enter the file path: " })];
            case 1:
                filePath = _a.sent();
                return [4 /*yield*/, (0, prompts_1.input)({ message: "Enter the boss name: " })];
            case 2:
                bossName = _a.sent();
                return [4 /*yield*/, (0, prompts_1.input)({ message: "Enter the player name: " })];
            case 3:
                playerName = _a.sent();
                return [4 /*yield*/, (0, prompts_1.input)({ message: "Enter the spell name: " })];
            case 4:
                spellName = _a.sent();
                return [4 /*yield*/, (0, prompts_1.input)({ message: "Enter the damage modifier: " })];
            case 5:
                dmgModifier = _a.sent();
                return [2 /*return*/, { filePath: filePath, bossName: bossName, playerName: playerName, dmgModifier: dmgModifier, spellName: spellName }];
        }
    });
}); };
var filterByBossAndPlayer = function (file, bossName, playerName, spellName) {
    var lines = file.split("\n");
    return lines
        .map(function (line, index) { return ({ index: index, line: line }); })
        .filter(function (_a) {
        var line = _a.line;
        return line.includes(bossName) &&
            line.includes(playerName) &&
            line.includes(spellName);
    });
};
var applyDmgModifier = function (lines, modifier) {
    return lines.map(function (_a) {
        var line = _a.line, index = _a.index;
        var lineElements = line.split(",");
        var dmgValue = lineElements[28];
        if (+dmgValue) {
            lineElements[28] = "".concat((Number(dmgValue) * (1 + modifier / 100)).toFixed(0));
        }
        return { index: index, line: lineElements.join(",") };
    });
};
var writeModifiedFile = function (file, answers, modifiedLines) {
    var fileName = answers.filePath.split("/").pop();
    var modifiedFileName = fileName.replace(".txt", "_modified.txt");
    var lines = file.split("\n");
    modifiedLines.forEach(function (_a) {
        var index = _a.index, line = _a.line;
        lines[index] = line;
    });
    (0, fs_1.writeFileSync)(modifiedFileName, lines.join("\n"));
};
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var answers, file, lines, modifiedLines;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, askQuestions()];
                case 1:
                    answers = _a.sent();
                    file = (0, fs_1.readFileSync)(answers.filePath, "utf-8");
                    lines = filterByBossAndPlayer(file, answers.bossName, answers.playerName, answers.spellName);
                    modifiedLines = applyDmgModifier(lines, Number(answers.dmgModifier));
                    writeModifiedFile(file, answers, modifiedLines);
                    console.log("Modified log file created successfully");
                    return [2 /*return*/];
            }
        });
    });
}
main();
