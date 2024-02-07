export class LogParser {
  private log: Array<{ index: number; line: string }> = [];
  private playersCache: Record<string, boolean> = {};
  private bossData: Array<{ index: number; line: string }> = [];
  private playerDataByBoss: Array<{ index: number; line: string }> = [];
  private raidDataByBoss: Array<{ index: number; line: string }> = [];
  private ACCEPTED_DAMAGE_TYPES = ["SPELL_DAMAGE", "RANGE_DAMAGE"] as const;

  constructor(
    private newLog: string,
    private bossName: string,
    private playersToEnhance: string,
    private realmName: string
  ) {
    this.prepareLogForParsing();
    this.preparePlayersToEnhance();
    this.prepareBossData();
    this.preparePlayerDataByBoss();
    this.prepareRaidDataByBoss();
  }

  private prepareLogForParsing = () => {
    this.log = this.newLog.split("\n").map((line, index) => ({ index, line }));
  };

  private preparePlayersToEnhance = () => {
    this.playersToEnhance.split(";").forEach((player) => {
      this.playersCache[`"${player}-${this.realmName}"`] = true;
    });
  };

  private prepareBossData = () => {
    this.bossData = this.log.filter(({ line }) => line.includes(this.bossName));
  };

  private preparePlayerDataByBoss = () => {
    this.playerDataByBoss = this.bossData.filter(
      ({ line }) =>
        line.includes(this.bossName) &&
        line.split(",").some((word) => this.playersCache[word]) &&
        this.ACCEPTED_DAMAGE_TYPES.filter((word) => line.includes(word))
          .length > 0
    );
  };

  private prepareRaidDataByBoss = () => {
    this.raidDataByBoss = this.bossData.filter(
      ({ line }) =>
        line.includes(this.bossName) &&
        line.includes(this.realmName) &&
        !line.split(",").some((word) => this.playersCache[word]) &&
        this.ACCEPTED_DAMAGE_TYPES.filter((word) => line.includes(word))
          .length > 0
    );
  };

  getPlayerDataByBoss = () => {
    return this.playerDataByBoss;
  };

  getRaidDataByBoss = () => {
    return this.raidDataByBoss;
  };
}
