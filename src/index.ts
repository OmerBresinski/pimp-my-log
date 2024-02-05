import { input } from "@inquirer/prompts";
import { readFileSync, writeFileSync } from "fs";
let totalDmgAdded = 0;
let file: string;
let fileName: string;
let linesToSubtract = 0;
let isDoneSubtracting = false;
let answers: any;

const askQuestions = async () => {
  const filePath = await input({ message: "Enter the file path: " });
  const bossName = await input({ message: "Enter the boss name: " });
  const playerNames = await input({ message: "Enter the enhanced players names (ex: Johnny;Jane): " });
  const spellNames = await input({ message: "Enter the spell names (ex: Auto Shot,Chimera;SWING_DAMAGE,Fireball): " });
  const realmName = await input({ message: "Enter name of the realm (ex: LivingFlame): " });
  const dmgModifier = await input({ message: "Enter the damage modifier: " });

  return { filePath, bossName, playerNames, dmgModifier, realmName, spellNames };
};

const filterByBossAndPlayer = (
  fileE: string,
  bossName: string,
  playerName: string,
  spellName: string,
  pNames: string,
  forSubtraction: boolean
) => {
  const lines = fileE.split("\n");
  if (!forSubtraction){
    return lines
      .map((line, index) => ({ index, line }))
      .filter(
        ({ line }) =>
          line.includes(bossName) &&
          line.includes(playerName) &&
          line.includes(spellName)
      );
  } else {
    let pNamesDict: Record<string, boolean> = {};
    pNames.split(";").forEach((pname) => {
      pNamesDict[pname+"-"+playerName] = true;
    });
    return lines
      .map((line, index) => ({ index, line }))
      .filter(
        ({ line }) =>
          line.includes(bossName) &&
          line.includes(playerName) &&
          !line.split(",").some(word => pNamesDict[word]) &&
          line.includes(spellName)
      );
  }  
};

const applyDmgModifier = (
  lines: Array<{ index: number; line: string }>,
  modifier: number,
  remainder: number
) => {
  console.log("Entered applyDmgModifier function");
  if (lines.length == 0) {
    console.log("0 lines modified");
    return lines;
  }
  return lines.map(({ line, index }) => {
    const lineElements = line.split(",");

    const dmgValue = lineElements[28];

    if (+dmgValue) {
      let dmgToAdd = "";
      if (modifier > 0){
        dmgToAdd = (Number(dmgValue) * (1 + modifier / 100)).toFixed(0);
      } else {
        if (remainder < 2 * modifier){ // both negative
          console.log("remainder: " + remainder);
          remainder -= modifier;
          dmgToAdd = String(Number(dmgValue) + modifier + modifier );
          console.log("new remainder: " + remainder + ". dmgToAdd: " + dmgToAdd);
        } else {
          dmgToAdd = String(Number(dmgValue) + modifier + remainder );
          remainder = 0;
        }
      }
      
      lineElements[28] = `${dmgToAdd}`;
      let increment = (Number(dmgToAdd)- Number(dmgValue))
      totalDmgAdded += increment;
      if (totalDmgAdded == 0){ isDoneSubtracting = true; return { index, line: lineElements.join(",") };} 
      if (totalDmgAdded < 0 ) {
        lineElements[28] = `${Number(dmgToAdd)+Math.abs(totalDmgAdded)}`;
        totalDmgAdded = 0;
        isDoneSubtracting = true;
        return { index, line: lineElements.join(",") }; 
      }
      //console.log("dmg added: " + increment + ". total: " + totalDmgAdded); 
    } else{
    //  console.log("error: " + dmgValue + " not dmgvalue");
    }

    return { index, line: lineElements.join(",") };
  });
};

const writeModifiedFile = (
  file: string,
  modifiedLines: Array<{ index: number; line: string }>
) => {
  
  const lines = file.split("\n");

  modifiedLines.forEach(({ index, line }) => {
    lines[index] = line;
  });

  writeFileSync(fileName, lines.join("\n"));
  file = readFileSync(fileName, "utf-8"); // TODO: Optimize such that the file variable is updated in the workspace instead of written and read from the OS
};

const modifyDmg = (
  pNames: string,
  sNames: string,
  bossName: string,
  dmgModifier: number,
  remainder: number,
  realmName: string,
  modify: boolean,
  done: boolean
) => {
  if (done) return;
  let playerIndex = 0;
  let forSubtraction = dmgModifier < 0;
  pNames.split(";").forEach((name: string) => { 
    sNames.split(";")[playerIndex].split(",").forEach((spell: string) => {
      let lines = filterByBossAndPlayer(
        file,
        bossName,
        name,
        spell,
        answers.playerNames,
        forSubtraction

      );
      console.log(name + " " + spell +"\nnum lines: " + lines.length);
      if (modify){
        if (dmgModifier < 0){
          done = true
          console.log("negative modifier: " + dmgModifier + ". remainder: " + remainder);
        }
        let modifiedLines = applyDmgModifier(lines, dmgModifier, remainder);

        writeModifiedFile(file, modifiedLines);
        console.log("Total dmg added after player " + name + " and spell " + spell + ": " + totalDmgAdded);
      } else { // for dmg reduction, first only count the amount of lines, so we can calculate how much to subtract per line
        linesToSubtract += lines.length;
      }
    });
    if (dmgModifier > 0){ // generic list for other DPS
      playerIndex++;
    }
  });
  if (!isDoneSubtracting){
    let modifier: number = -1;
    if (linesToSubtract < totalDmgAdded){
      modifier = - Number((totalDmgAdded / linesToSubtract).toFixed(0))
      remainder = - (totalDmgAdded % linesToSubtract);
    } else { 
      remainder = 0;
    }
    modifyDmg(realmName, "SWING_DAMAGE_LANDED,SPELL_DAMAGE", bossName, modifier, remainder, realmName, !modify, done)
  }
}
async function main() {
  answers = await askQuestions();
  file = readFileSync(answers.filePath, "utf-8");
  fileName = (String(answers.filePath.split("/").pop()));
  const currentDate = new Date();
  fileName = fileName.replace(".txt", "_modified"+currentDate.getTime()+".txt");

  modifyDmg(answers.playerNames, answers.spellNames, answers.bossName,Number(answers.dmgModifier), 0, answers.realmName, true, false);

  console.log("Modified log file created successfully");
}

main();