// Shared XML builder/parser matching SS_SDB_DEFAULT_CONFIG.xml structure.
// The XML has three top-level blocks under <SDBGenerator>:
//   1. <SDBDefaultParameters>           – overall (global) defaults
//   2. <ProjectSpecSDBInfo>             – project-specific data (incl. user settings)
//   3. <UserSettingsConfigurationBlock> – overall/default user settings
//
// Each block contains LNBBlock, SwitchBlock, MotorBlock, UnicableConfigurationBlock,
// SatelliteBlock, UserSettingsConfigurationBlock (where applicable).

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const DEFAULT_USER_SETTINGS = {
  OutputFormat: "4:3",
  DisplayMode: "RGB",
  TVFormat: "Auto",
  DisplayOSDMode: "OFF",
  Password: "XXX",
  OSDLanguage: "Languages list",
  FirstAudioLanguage: "Languages list",
  SubtitleDefLanguage: "Languages list",
  Volume: "10",
  ThemesLevel: "0",
  TransparencyLevel: "20",
  SubtitleStatus: "OFF",
  TeletextStatus: "OFF",
};

export interface BuildXMLInput {
  projectName?: string;
  buildName?: string;
  lnbs?: any[];
  switches?: any[];
  motors?: any[];
  unicables?: any[];
  satellites?: any[];
  // global defaults to render in <SDBDefaultParameters>
  defaults?: {
    lnbs?: any[];
    switches?: any[];
    motors?: any[];
    unicables?: any[];
    satellites?: any[];
  };
  userSettings?: Partial<typeof DEFAULT_USER_SETTINGS>;
  projectUserSettings?: Partial<typeof DEFAULT_USER_SETTINGS>;
}

const renderUserSettings = (s: Partial<typeof DEFAULT_USER_SETTINGS> = {}) => {
  const merged = { ...DEFAULT_USER_SETTINGS, ...s };
  let xml = `\t<UserSettingsConfigurationBlock>\n\t\t<UserSettingsInfo>\n`;
  Object.entries(merged).forEach(([k, v]) => {
    xml += `\t\t\t<${k}>${esc(v)}</${k}>\n`;
  });
  xml += `\t\t</UserSettingsInfo>\n\t</UserSettingsConfigurationBlock>\n`;
  return xml;
};

const renderLNBBlock = (lnbs: any[] = [], indent = "\t\t") => {
  if (!lnbs.length) return "";
  let xml = `${indent}<LNBBlock>\n`;
  lnbs.forEach((l) => {
    xml += `${indent}\t<LNBInfo>\n`;
    xml += `${indent}\t\t<LnbType>${esc(l.lnbType || l.type || "UNIVERSAL_LNB")}</LnbType>\n`;
    xml += `${indent}\t\t<BandType>${esc(l.bandType || "")}</BandType>\n`;
    xml += `${indent}\t\t<LowFreq>${esc(l.lowFrequency || l.lowFreq || "")}</LowFreq>\n`;
    xml += `${indent}\t\t<HighFreq>${esc(l.highFrequency || l.highFreq || "")}</HighFreq>\n`;
    xml += `${indent}\t\t<LnbPowerControl>${esc(l.powerControl || l.lnbPowerControl || "ON")}</LnbPowerControl>\n`;
    xml += `${indent}\t\t<LNBPower>${esc(l.vControl || l.lnbPower || "None")}</LNBPower>\n`;
    xml += `${indent}\t\t<RepeatMode>${esc(l.repeatMode || "None")}</RepeatMode>\n`;
    xml += `${indent}\t\t<F22kHz>${esc(l.khzOption || l.f22kHz || "OFF")}</F22kHz>\n`;
    xml += `${indent}\t</LNBInfo>\n`;
  });
  xml += `${indent}</LNBBlock>\n`;
  return xml;
};

const renderSwitchBlock = (switches: any[] = [], indent = "\t\t") => {
  if (!switches.length) return "";
  let xml = `${indent}<SwitchBlock>\n`;
  switches.forEach((s) => {
    const opts: string[] = Array.isArray(s.switchOptions) ? s.switchOptions : [];
    xml += `${indent}\t<SwitchInput type="${esc(s.switchType || "DiSEqC 1.0")}" NoOfSwitches="${opts.length || 0}">\n`;
    opts.forEach((o) => {
      xml += `${indent}\t\t<switch>${esc(o)}</switch>\n`;
    });
    xml += `${indent}\t</SwitchInput>\n`;
  });
  xml += `${indent}</SwitchBlock>\n`;
  return xml;
};

const renderMotorBlock = (motors: any[] = [], indent = "\t\t") => {
  if (!motors.length) return "";
  let xml = `${indent}<MotorBlock>\n`;
  motors.forEach((m) => {
    const type = m.motorType || m.type || "DiSEqC 1.2";
    xml += `${indent}\t<MotorInput type="${esc(type)}">\n`;
    if (type.includes("1.2") && m.position !== undefined && !m.longitude) {
      xml += `${indent}\t\t<Position>${esc(m.position)}</Position>\n`;
    } else {
      xml += `${indent}\t\t<Longitude>${esc(m.longitude || "")}</Longitude>\n`;
      xml += `${indent}\t\t<EastorWest>${esc(m.eastWest || "E")}</EastorWest>\n`;
      xml += `${indent}\t\t<Latitude>${esc(m.latitude || "")}</Latitude>\n`;
      xml += `${indent}\t\t<NorthorSouth>${esc(m.northSouth || "N")}</NorthorSouth>\n`;
    }
    xml += `${indent}\t</MotorInput>\n`;
  });
  xml += `${indent}</MotorBlock>\n`;
  return xml;
};

const renderUnicableBlock = (unicables: any[] = [], indent = "\t\t") => {
  if (!unicables.length) return "";
  let xml = `${indent}<UnicableConfigurationBlock>\n`;
  unicables.forEach((u) => {
    const type = u.unicableType || u.type || "DSCR";
    const attrs = [`type="${esc(type)}"`];
    if (u.port) attrs.push(`port="${esc(u.port)}"`);
    if (u.status) attrs.push(`status="${esc(u.status)}"`);
    xml += `${indent}\t<UnicableInput ${attrs.join(" ")}>\n`;
    const slots: any[] = Array.isArray(u.ifSlots) ? u.ifSlots : [];
    const tag = type === "DCSS" ? "DCSS_InputInfo" : "DSCR_InputInfo";
    slots.forEach((slot, idx) => {
      const slotNo = typeof slot === "object" ? slot.slotNo ?? idx + 1 : idx + 1;
      const ifFreq = typeof slot === "object" ? slot.ifFrequency ?? slot : slot;
      xml += `${indent}\t\t<${tag}>\n`;
      xml += `${indent}\t\t\t<Slot_No>${esc(slotNo)}</Slot_No>\n`;
      xml += `${indent}\t\t\t<IF_Frequency>${esc(ifFreq)}</IF_Frequency>\n`;
      xml += `${indent}\t\t</${tag}>\n`;
    });
    xml += `${indent}\t</UnicableInput>\n`;
  });
  xml += `${indent}</UnicableConfigurationBlock>\n`;
  return xml;
};

const renderSatelliteBlock = (satellites: any[] = [], indent = "\t\t") => {
  if (!satellites.length) return "";
  let xml = `${indent}<SatelliteBlock>\n`;
  satellites.forEach((sat) => {
    xml += `${indent}\t<SatelliteInfo>\n`;
    xml += `${indent}\t\t<SatelliteInfoName>${esc(sat.name)}</SatelliteInfoName>\n`;
    xml += `${indent}\t\t<Position>${esc(sat.orbitalPosition || sat.position || "0")}</Position>\n`;
    xml += `${indent}\t\t<Angle>${esc(sat.angle || sat.position || "0")}</Angle>\n`;
    xml += `${indent}\t\t<EastorWest>${esc(sat.eastWest || (sat.direction === "West" ? "W" : "E"))}</EastorWest>\n`;
    xml += `${indent}\t\t<FactoryDefault>${esc(sat.factoryDefault ?? "0")}</FactoryDefault>\n`;
    (sat.carriers || []).length &&
      (xml += `${indent}\t\t<CarrierBlock>\n`);
    (sat.carriers || []).forEach((c: any) => {
      xml += `${indent}\t\t\t<CarrierInput>\n`;
      xml += `${indent}\t\t\t\t<CarrierName>${esc(c.name)}</CarrierName>\n`;
      xml += `${indent}\t\t\t\t<Frequency>${esc(c.frequency || "")}</Frequency>\n`;
      xml += `${indent}\t\t\t\t<Polarization>${esc(c.polarization || "")}</Polarization>\n`;
      xml += `${indent}\t\t\t\t<SymbolRate>${esc(c.symbolRate || "")}</SymbolRate>\n`;
      xml += `${indent}\t\t\t\t<FEC>${esc(c.fec || "Auto")}</FEC>\n`;
      xml += `${indent}\t\t\t\t<FECMode>${esc(c.fecMode || "DVBS")}</FECMode>\n`;
      xml += `${indent}\t\t\t\t<ModulationType>${esc(c.modulationType || "QPSK")}</ModulationType>\n`;
      xml += `${indent}\t\t\t\t<TSid>${esc(c.tsid || "0")}</TSid>\n`;
      xml += `${indent}\t\t\t\t<NWid>${esc(c.networkId || "0")}</NWid>\n`;
      xml += `${indent}\t\t\t\t<ONid>${esc(c.onid || "0")}</ONid>\n`;
      xml += `${indent}\t\t\t\t<FactoryDefault>${esc(c.factoryDefault ?? "0")}</FactoryDefault>\n`;
      xml += `${indent}\t\t\t\t<ServiceBlock>\n`;
      (c.services || []).forEach((s: any) => {
        xml += `${indent}\t\t\t\t\t<ServiceInput>\n`;
        xml += `${indent}\t\t\t\t\t\t<ServiceName>${esc(s.name)}</ServiceName>\n`;
        xml += `${indent}\t\t\t\t\t\t<ServiceType>${esc(s.serviceType || s.type || "TV")}</ServiceType>\n`;
        xml += `${indent}\t\t\t\t\t\t<VideoPID>${esc(s.videoPid || "")}</VideoPID>\n`;
        xml += `${indent}\t\t\t\t\t\t<AudioPID>${esc(s.audioPid || "")}</AudioPID>\n`;
        xml += `${indent}\t\t\t\t\t\t<PCRPID>${esc(s.pcrPid || "")}</PCRPID>\n`;
        xml += `${indent}\t\t\t\t\t\t<ProgramNumber>${esc(s.programNumber || "")}</ProgramNumber>\n`;
        xml += `${indent}\t\t\t\t\t\t<FavGroup>${esc(s.favGroup || "")}</FavGroup>\n`;
        xml += `${indent}\t\t\t\t\t\t<FactoryDefault>${esc(s.factoryDefault ?? "0")}</FactoryDefault>\n`;
        xml += `${indent}\t\t\t\t\t\t<Preference>${esc(s.preference || "0")}</Preference>\n`;
        xml += `${indent}\t\t\t\t\t\t<Scramble>${esc(s.scramble || "0")}</Scramble>\n`;
        xml += `${indent}\t\t\t\t\t</ServiceInput>\n`;
      });
      xml += `${indent}\t\t\t\t</ServiceBlock>\n`;
      xml += `${indent}\t\t\t</CarrierInput>\n`;
    });
    (sat.carriers || []).length &&
      (xml += `${indent}\t\t</CarrierBlock>\n`);
    xml += `${indent}\t</SatelliteInfo>\n`;
  });
  xml += `${indent}</SatelliteBlock>\n`;
  return xml;
};

export function buildSDBXML(input: BuildXMLInput): string {
  const d = input.defaults || {};
  let xml = `<?xml version="1.0" ?>\n<SDBGenerator>\n`;

  // 1. Overall defaults
  xml += `\t<SDBDefaultParameters>\n`;
  xml += renderLNBBlock(d.lnbs || [], "\t\t");
  xml += renderSwitchBlock(d.switches || [], "\t\t");
  xml += renderMotorBlock(d.motors || [], "\t\t");
  xml += renderUnicableBlock(d.unicables || [], "\t\t");
  xml += renderSatelliteBlock(d.satellites || [], "\t\t");
  xml += `\t</SDBDefaultParameters>\n\n`;

  // 2. Project-specific
  xml += `\t<ProjectSpecSDBInfo>\n`;
  xml += `\t\t<ProjectInfo>\n`;
  xml += `\t\t\t<ProjectName>${esc(input.projectName || input.buildName || "Project")}</ProjectName>\n`;
  if (input.buildName) xml += `\t\t\t<BuildName>${esc(input.buildName)}</BuildName>\n`;
  xml += `\t\t</ProjectInfo>\n`;
  xml += renderLNBBlock(input.lnbs || [], "\t\t");
  xml += renderSwitchBlock(input.switches || [], "\t\t");
  xml += renderMotorBlock(input.motors || [], "\t\t");
  xml += renderUnicableBlock(input.unicables || [], "\t\t");
  xml += renderSatelliteBlock(input.satellites || [], "\t\t");
  xml += renderUserSettings(input.projectUserSettings).replace(/^\t/gm, "\t\t");
  xml += `\t</ProjectSpecSDBInfo>\n\n`;

  // 3. Overall user settings
  xml += renderUserSettings(input.userSettings);

  xml += `</SDBGenerator>\n`;
  return xml;
}

// ----------------- Parser (for BIN→XML import) -----------------

const textOf = (el: Element | null, tag: string) =>
  el?.querySelector(tag)?.textContent?.trim() || "";

export interface ParsedProjectData {
  name: string;
  description: string;
  lnbs: any[];
  switches: any[];
  motors: any[];
  unicables: any[];
  satellites: any[];
}

export function parseSDBXML(xmlString: string): ParsedProjectData {
  const doc = new DOMParser().parseFromString(xmlString, "text/xml");
  const result: ParsedProjectData = {
    name: "",
    description: "",
    lnbs: [],
    switches: [],
    motors: [],
    unicables: [],
    satellites: [],
  };

  // Prefer ProjectSpecSDBInfo, fall back to root
  const root =
    doc.querySelector("ProjectSpecSDBInfo") ||
    doc.querySelector("SDBDefaultParameters") ||
    doc.documentElement;

  result.name = textOf(doc.querySelector("ProjectInfo"), "ProjectName") || "Imported Project";

  // LNBs
  root.querySelectorAll(":scope > LNBBlock > LNBInfo, LNBBlock > LNBInfo").forEach((n, i) => {
    result.lnbs.push({
      name: `LNB-${i + 1}-${textOf(n, "BandType")}`,
      lnbType: textOf(n, "LnbType"),
      bandType: textOf(n, "BandType"),
      lowFrequency: textOf(n, "LowFreq"),
      highFrequency: textOf(n, "HighFreq"),
      powerControl: textOf(n, "LnbPowerControl"),
      vControl: textOf(n, "LNBPower"),
      repeatMode: textOf(n, "RepeatMode"),
      khzOption: textOf(n, "F22kHz"),
    });
  });

  // Switches
  root.querySelectorAll("SwitchBlock > SwitchInput").forEach((n, i) => {
    const opts = Array.from(n.querySelectorAll("switch")).map((s) => s.textContent?.trim() || "");
    result.switches.push({
      name: `Switch-${i + 1}`,
      switchType: n.getAttribute("type") || "DiSEqC 1.0",
      switchOptions: opts,
    });
  });

  // Motors
  root.querySelectorAll("MotorBlock > MotorInput").forEach((n, i) => {
    result.motors.push({
      name: `Motor-${i + 1}`,
      motorType: n.getAttribute("type") || "DiSEqC 1.2",
      position: textOf(n, "Position"),
      longitude: textOf(n, "Longitude"),
      latitude: textOf(n, "Latitude"),
      eastWest: textOf(n, "EastorWest"),
      northSouth: textOf(n, "NorthorSouth"),
    });
  });

  // Unicables
  root.querySelectorAll("UnicableConfigurationBlock > UnicableInput").forEach((n, i) => {
    const slots = Array.from(n.querySelectorAll("DSCR_InputInfo, DCSS_InputInfo")).map((s) => ({
      slotNo: textOf(s, "Slot_No"),
      ifFrequency: textOf(s, "IF_Frequency"),
    }));
    result.unicables.push({
      name: `Unicable-${i + 1}`,
      unicableType: n.getAttribute("type") || "DSCR",
      port: n.getAttribute("port") || "",
      status: n.getAttribute("status") || "",
      ifSlots: slots,
    });
  });

  // Satellites
  root.querySelectorAll("SatelliteBlock > SatelliteInfo").forEach((n) => {
    const carriers: any[] = [];
    n.querySelectorAll("CarrierBlock > CarrierInput").forEach((c) => {
      const services: any[] = [];
      c.querySelectorAll("ServiceBlock > ServiceInput").forEach((s) => {
        services.push({
          name: textOf(s, "ServiceName"),
          serviceType: textOf(s, "ServiceType"),
          videoPid: textOf(s, "VideoPID"),
          audioPid: textOf(s, "AudioPID"),
          pcrPid: textOf(s, "PCRPID"),
          programNumber: textOf(s, "ProgramNumber"),
          favGroup: textOf(s, "FavGroup"),
          factoryDefault: textOf(s, "FactoryDefault"),
          preference: textOf(s, "Preference"),
          scramble: textOf(s, "Scramble"),
        });
      });
      carriers.push({
        name: textOf(c, "CarrierName"),
        frequency: textOf(c, "Frequency"),
        polarization: textOf(c, "Polarization"),
        symbolRate: textOf(c, "SymbolRate"),
        fec: textOf(c, "FEC"),
        fecMode: textOf(c, "FECMode"),
        modulationType: textOf(c, "ModulationType"),
        tsid: textOf(c, "TSid"),
        networkId: textOf(c, "NWid"),
        onid: textOf(c, "ONid"),
        factoryDefault: textOf(c, "FactoryDefault"),
        services,
      });
    });
    result.satellites.push({
      name: textOf(n, "SatelliteInfoName"),
      position: textOf(n, "Position"),
      angle: textOf(n, "Angle"),
      eastWest: textOf(n, "EastorWest"),
      direction: textOf(n, "EastorWest") === "W" ? "West" : "East",
      factoryDefault: textOf(n, "FactoryDefault"),
      carriers,
    });
  });

  return result;
}
