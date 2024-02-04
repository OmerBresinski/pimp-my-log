import { input } from "@inquirer/prompts";
import { readFileSync, writeFileSync } from "fs";

const askQuestions = async () => {
  const filePath = await input({ message: "Enter the file path: " });
  const bossName = await input({ message: "Enter the boss name: " });
  const playerName = await input({ message: "Enter the player name: " });
  const spellName = await input({ message: "Enter the spell name: " });
  const dmgModifier = await input({ message: "Enter the damage modifier: " });

  return { filePath, bossName, playerName, dmgModifier, spellName };
};

const filterByBossAndPlayer = (
  file: string,
  bossName: string,
  playerName: string,
  spellName: string
) => {
  const lines = file.split("\n");
  return lines
    .map((line, index) => ({ index, line }))
    .filter(
      ({ line }) =>
        line.includes(bossName) &&
        line.includes(playerName) &&
        line.includes(spellName)
    );
};

const applyDmgModifier = (
  lines: Array<{ index: number; line: string }>,
  modifier: number
) => {
  return lines.map(({ line, index }) => {
    const lineElements = line.split(",");
    const dmgValue = lineElements[28];

    if (+dmgValue) {
      lineElements[28] = `${(Number(dmgValue) * (1 + modifier / 100)).toFixed(
        0
      )}`;
    }

    return { index, line: lineElements.join(",") };
  });
};

const writeModifiedFile = (
  file: string,
  answers: any,
  modifiedLines: Array<{ index: number; line: string }>
) => {
  const fileName = answers.filePath.split("/").pop();
  const modifiedFileName = fileName.replace(".txt", "_modified.txt");
  const lines = file.split("\n");

  modifiedLines.forEach(({ index, line }) => {
    lines[index] = line;
  });

  writeFileSync(modifiedFileName, lines.join("\n"));
};

async function main() {
  const answers = await askQuestions();
  const file = readFileSync(answers.filePath, "utf-8");
  const lines = filterByBossAndPlayer(
    file,
    answers.bossName,
    answers.playerName,
    answers.spellName
  );
  const modifiedLines = applyDmgModifier(lines, Number(answers.dmgModifier));

  writeModifiedFile(file, answers, modifiedLines);

  console.log("Modified log file created successfully");
}

main();
