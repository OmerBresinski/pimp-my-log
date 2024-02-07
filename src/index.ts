import { input } from "@inquirer/prompts";
import { readFileSync, writeFileSync } from "fs";
let totalDmgAdded = 0;
let file: string;


const askQuestions = async () => {
  const filePath = await input({ message: "Enter the file path: " });
  const bossName = await input({ message: "Enter the boss name: " });
  const playerNames = await input({ message: "Enter the enhanced players names (ex: Johnny;Jane): " });
  const realmName = await input({ message: "Enter name of the realm (ex: LivingFlame): " });
  const dmgModifier = await input({ message: "Enter the damage modifier: " });

  return { filePath, bossName, playerNames, realmName, dmgModifier };
};

const filterByBossAndPlayer = (
  fileE: string,
  bossName: string,
  realmName: string,
  spellName: string,
  pNames: string,
  boostingDmg: boolean
) => {
  const lines = fileE.split("\n");
  let pNamesDict: Record<string, boolean> = {};
  pNames.split(";").forEach((pname) => {
    pNamesDict["\"" + pname+"-"+realmName+"\""] = true;
  });
  if (boostingDmg){
    return lines
      .map((line, index) => ({ index, line }))
      .filter(
        ({ line }) =>
          line.includes(bossName) &&
          line.split(",").some(word => pNamesDict[word]) &&
          line.includes(spellName)
      );
  } else {
    return lines
      .map((line, index) => ({ index, line }))
      .filter(
        ({ line }) =>
          line.includes(bossName) &&
          line.includes(realmName) &&
          !line.split(",").some(word => pNamesDict[word]) &&
          line.includes(spellName)
      );
  }  
};

const applyDmgModifier = ( // receives all the player and raid lines to boost/subtract
  pLines: Array<{ index: number; line: string }>,
  rLines: Array<{ index: number; line: string }>,
  modifier: number
) => {

  const playerLines = applyDmgToPlayer(pLines, modifier);
  let {subtractor, remainder }  = calculateSubtractorAndRemainder(rLines.length, totalDmgAdded);
  const raidLines = applyDmgToRaid(rLines, subtractor, remainder);
  const modifiedLines = [...playerLines, ...raidLines]
  return modifiedLines;
  
};

const applyDmgToRaid = (
  rLines: Array<{ index: number; line: string }>,
   subtractor: number,
   remainder: number
) =>{
  return rLines.map(({ line, index }) => {
    const lineElements = line.split(",");

    const dmgValue = lineElements[28];

    if (+dmgValue) {
      const calculatedDmg = calculateDmgToAdd(dmgValue, subtractor, remainder);
      let dmgToAdd = calculatedDmg.dmgToAdd;
      remainder = calculatedDmg.newRemainder;
      let increment = (Number(dmgToAdd)- Number(dmgValue))
      if (Number(dmgToAdd) > 20){
        lineElements[28] = `${dmgToAdd}`;
        totalDmgAdded += increment;
        if (totalDmgAdded == 0){ return { index, line: lineElements.join(",") };} 
        if (totalDmgAdded < 0 ) {
          lineElements[28] = `${Number(dmgToAdd)+Math.abs(totalDmgAdded)}`;
          totalDmgAdded = 0;
          return { index, line: lineElements.join(",") }; 
        }
      } else {
        remainder = remainder + increment;
      }
      //console.log("dmg added: " + increment + ". total: " + totalDmgAdded); 
    } else{
    //  console.log("error: " + dmgValue + " not dmgvalue");
    }

    return { index, line: lineElements.join(",") };
  });
}


const applyDmgToPlayer = (
  pLines: Array<{ index: number; line: string }>,
  modifier: number
) => {
    return pLines.map(({ line, index }) => {
    const lineElements = line.split(",");

    const dmgValue = lineElements[28];

    if (+dmgValue) {
      const calculatedDmg = calculateDmgToAdd(dmgValue, modifier, 0);
      let dmgToAdd = calculatedDmg.dmgToAdd;
      
      lineElements[28] = `${dmgToAdd}`;
      let increment = (Number(dmgToAdd)- Number(dmgValue))
      totalDmgAdded += increment;
      //console.log("dmg added: " + increment + ". total: " + totalDmgAdded); 
    } else{
    //  console.log("error: " + dmgValue + " not dmgvalue");
    }

    return { index, line: lineElements.join(",") };
  });
}

const calculateDmgToAdd = (
  dmgValue: string,
  modifier: number,
  remainder: number
) => {
  let dmgToAdd = "";
  if (modifier > 0){ // boosting iteration
    dmgToAdd = (Number(dmgValue) * (1 + modifier / 100)).toFixed(0);
  } else {
    if (remainder < 2 * modifier){ // both negative
      //console.log("remainder: " + remainder);
      //console.log("previous dmg: " + dmgValue);

      remainder -= modifier;
      dmgToAdd = String(Number(dmgValue) + modifier + modifier );
      //console.log("new remainder: " + remainder + ". dmgToAdd: " + dmgToAdd);
      
    } else {
      dmgToAdd = String(Number(dmgValue) + modifier + remainder );
      remainder = 0;
    }
  }
  let newRemainder = remainder;
  return { dmgToAdd, newRemainder }
}


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
  playerNames: string,
  bossName: string,
  dmgModifier: number,
  realmName: string,
  spellNames: string
) => {
  let playerLines: Array<{ index: number; line: string }> = [];
  spellNames.split(",").forEach((spell: string) => {
    let linesP = filterByBossAndPlayer(
        file,
        bossName,
        realmName,
        spell,
        playerNames,
        true
      );
      playerLines = [...playerLines, ...linesP];
    });

    let raidLines: Array<{ index: number; line: string }> = [];
    spellNames.split(",").forEach((spell: string) => {
      let linesR = filterByBossAndPlayer(
          file,
          bossName,
          realmName,
          spell,
          playerNames,
          false
        );
        raidLines = [...raidLines, ...linesR];
    });
    console.log("player lines: " + playerLines.length + ". raid lines: " + raidLines.length);
    const modifiedLines = applyDmgModifier(playerLines, raidLines, dmgModifier);
    updateModifiedFile(modifiedLines);
    if (totalDmgAdded == 0) {
      console.log("Everything seems to be in order!");
    } else {
      console.log("Something went wrong. Total damage added is " + totalDmgAdded + " but should be 0.");
    }
}

const calculateSubtractorAndRemainder = (
  linesToSubtract: number,
  totalDmgAdded: number
) => {
  let subtractor: number = -1;
  let remainder = 0;
  if (linesToSubtract < totalDmgAdded){
    subtractor = - Number((totalDmgAdded / linesToSubtract).toFixed(0))
    remainder = - (totalDmgAdded % linesToSubtract);
  } 
  return {subtractor, remainder};
}

const readFileAndUpdateName =(
  path: string,
) =>{
  file = readFileSync(path, "utf-8");
  let fileName = (String(path.split("/").pop()));
  const currentDate = new Date();
  fileName = fileName.replace(".txt", "_modified"+currentDate.getTime()+".txt");
  return fileName;
}


async function main() {
  const answers = await askQuestions();
  const spellNames = "SPELL_DAMAGE,RANGE_DAMAGE"

  const fileName = readFileAndUpdateName(answers.filePath);

  modifyDmg(answers.playerNames, answers.bossName, Number(answers.dmgModifier), answers.realmName, spellNames);

  writeFileSync(fileName, file);
  console.log("Modified log file created successfully");
}

main();