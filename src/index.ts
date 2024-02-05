import { input } from "@inquirer/prompts";
import { readFileSync, writeFileSync } from "fs";
let totalDmgAdded = 0;
let dmgToSubtract = 0;
let file: string;
let fileName: string;

const askQuestions = async () => {
  const filePath = await input({ message: "Enter the file path: " });
  const bossName = await input({ message: "Enter the boss name: " });
  const playerNames = await input({ message: "Enter the enhanced players names (ex: Johnny;Jane): " });
  const spellNames = await input({ message: "Enter the spell names (ex: Auto Shot,Chimera;SWING_DAMAGE,Fireball): " });
  const otherDPSNames = await input({ message: "Enter names of other DPS players (ex: Adam;Eve;Abel): " });
  const dmgModifier = await input({ message: "Enter the damage modifier: " });

  return { filePath, bossName, playerNames, dmgModifier, otherDPSNames, spellNames };
};

const filterByBossAndPlayer = (
  fileE: string,
  bossName: string,
  playerName: string,
  spellName: string,
) => {
  const lines = fileE.split("\n");
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
  console.log("Entered applyDmgModifier function");
  //console.log(lines);
  return lines.map(({ line, index }) => {
    const lineElements = line.split(",");
    const dmgValue = lineElements[28];

    if (+dmgValue) {
      let dmgToAdd = (Number(dmgValue) * (1 + modifier / 100)).toFixed(0);
      lineElements[28] = `${dmgToAdd}`;
      totalDmgAdded += (Number(dmgToAdd));
      // console.log("dmg added: " + dmgToAdd + ". total: " + totalDmgAdded); this shows the added damage is too high
    } else{
    //  console.log("error: " + dmgValue + " not dmgvalue");
    }

    return { index, line: lineElements.join(",") };
  });
};

const writeModifiedFile = (
  file: string,
  answers: any,
  modifiedLines: Array<{ index: number; line: string }>
) => {
  
  const lines = file.split("\n");

  modifiedLines.forEach(({ index, line }) => {
    lines[index] = line;
  });

  writeFileSync(fileName, lines.join("\n"));
  file = readFileSync(fileName, "utf-8"); // TODO: Optimize such that the file variable is updated in the workspace instead of written and read from the OS
};

async function main() {
  const answers = await askQuestions();
  file = readFileSync(answers.filePath, "utf-8");
  fileName = (String(answers.filePath.split("/").pop()));
  const currentDate = new Date();
  fileName = fileName.replace(".txt", "_modified"+currentDate.getTime()+".txt");
  let playerIndex = 0;
  answers.playerNames.split(";").forEach((name) => { 
    answers.spellNames.split(";")[playerIndex].split(",").forEach((spell) => {
      let lines = filterByBossAndPlayer(
        file,
        answers.bossName,
        name,
        spell
      );
      let modifiedLines = applyDmgModifier(lines, Number(answers.dmgModifier));
    
      writeModifiedFile(file, answers, modifiedLines);
      console.log("Total dmg added after player " + name + " and spell " + spell + ": " + totalDmgAdded);
    });
    playerIndex++;
  });

  // TODO: add function to reduce damage. Probably won't know in advance by how much we're subtracting each time unless we send specific spells per player (don't wanna do that)



  console.log("Modified log file created successfully");
}

main();