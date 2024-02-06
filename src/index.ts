import { input } from "@inquirer/prompts";
import { readFileSync, writeFileSync } from "fs";
let totalDmgAdded = 0;
let file: string;
let fileName: string;
let linesToSubtract = 0;
let isDoneSubtracting = false;
const spellNames = "SPELL_DAMAGE,RANGE_DAMAGE"
let answers: any;

const askQuestions = async () => {
  const filePath = await input({ message: "Enter the file path: " });
  const bossName = await input({ message: "Enter the boss name: " });
  const playerNames = await input({ message: "Enter the enhanced players names (ex: Johnny;Jane): " });
  //const spellNames = await input({ message: "Enter the spell names (ex: Auto Shot,Chimera;SWING_DAMAGE,Fireball): " });
  const realmName = await input({ message: "Enter name of the realm (ex: LivingFlame): " });
  const dmgModifier = await input({ message: "Enter the damage modifier: " });

  return { filePath, bossName, playerNames, realmName, dmgModifier /*spellNames*/};
};

const filterByBossAndPlayer = (
  fileE: string,
  bossName: string,
  target: string,
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
          line.includes(target) &&
          line.includes(spellName)
      );
  } else {
    let pNamesDict: Record<string, boolean> = {};
    pNames.split(";").forEach((pname) => {
      pNamesDict["\"" + pname+"-"+target+"\""] = true;
    });
    return lines
      .map((line, index) => ({ index, line }))
      .filter(
        ({ line }) =>
          line.includes(bossName) &&
          line.includes(target) &&
          !line.split(",").some(word => pNamesDict[word]) &&
          line.includes(spellName)
      );
  }  
};

const applyDmgModifier = (
  lines: Array<{ index: number; line: string }>,
  modifier: number,
  remainder: number,
  ability: string
) => {
  let newRemainder = remainder;

  console.log("Entered applyDmgModifier function. Ability: " + ability);
  if (lines.length == 0) {
    console.log("0 lines modified");
    return {newRemainder, mappedLines: lines};
  }
  const mappedLines = lines.map(({ line, index }) => {
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
          console.log("previous dmg: " + dmgValue);

          dmgToAdd = String(Number(dmgValue) + modifier + modifier );
          console.log("new remainder: " + remainder + ". dmgToAdd: " + dmgToAdd);
          
        } else {
          dmgToAdd = String(Number(dmgValue) + modifier + remainder );
          remainder = 0;
        }
      }
      newRemainder = remainder;
      lineElements[28] = `${dmgToAdd}`;
      let increment = (Number(dmgToAdd)- Number(dmgValue))
      totalDmgAdded += increment;
      if (totalDmgAdded == 0 && increment < 0){ isDoneSubtracting = true; return { index, line: lineElements.join(",") };} 
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
  return { newRemainder, mappedLines };
};

const updateModifiedFile = (
  modifiedLines: Array<{ index: number; line: string }>
) => {
  
  const lines = file.split("\n");

  modifiedLines.forEach(({ index, line }) => {
    lines[index] = line;
  });
  file = lines.join("\n");

};

const modifyDmg = (
  targets: string,
  bossName: string,
  dmgModifier: number,
  remainder: number,
  realmName: string,
  modify: boolean,
  done: boolean
) => {
  if (done) return;
  let forSubtraction = dmgModifier < 0;
  targets.split(";").forEach((target: string) => { 
    spellNames.split(",").forEach((spell: string) => {
      if (!isDoneSubtracting){
        let lines = filterByBossAndPlayer(
          file,
          bossName,
          target,
          spell,
          answers.playerNames,
          forSubtraction
  
        );
        console.log(target + " " + spell +"\nnum lines: " + lines.length);
        if (modify){
          if (dmgModifier < 0){
            done = true
            console.log("negative modifier: " + dmgModifier + ". remainder: " + remainder);
          }
          let { newRemainder, mappedLines } = applyDmgModifier(lines, dmgModifier, remainder, spell);
          
          remainder = newRemainder;
          updateModifiedFile(mappedLines);
          console.log("Total dmg added after player " + target + " and spell " + spell + ": " + totalDmgAdded);
        } else { // for dmg reduction, first only count the amount of lines, so we can calculate how much to subtract per line
          linesToSubtract += lines.length;
        }
      }
    });
  });
  if (!isDoneSubtracting){
    let modifier: number = -1;
    if (linesToSubtract < totalDmgAdded){
      modifier = - Number((totalDmgAdded / linesToSubtract).toFixed(0))
      remainder = - (totalDmgAdded % linesToSubtract);
    } else { 
      remainder = 0;
    }
    modifyDmg(realmName, bossName, modifier, remainder, realmName, !modify, done)
  }
}
async function main() {
  answers = await askQuestions();
  file = readFileSync(answers.filePath, "utf-8");
  fileName = (String(answers.filePath.split("/").pop()));
  const currentDate = new Date();
  fileName = fileName.replace(".txt", "_modified"+currentDate.getTime()+".txt");

  modifyDmg(answers.playerNames, answers.bossName, Number(answers.dmgModifier), 0, answers.realmName, true, false);

  writeFileSync(fileName, file);
  console.log("Modified log file created successfully");
}

main();