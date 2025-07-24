import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const MASTR_API_BASE = "https://www.marktstammdatenregister.de/MaStR";
const USER_AGENT = "mastr-mcp/1.0";
const TIMEOUT = 25000;

// Helper for MaStR Requests
async function mastrRequest<T>(url: string): Promise<T | null> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept: "application/json",
  };

  try {
    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error("Error making MaStR request:", error);
    return null;
  }
}

interface FilterCodeMap {
  [name: string]: string;
}

const energyTypeCodes: FilterCodeMap = {
  Photovoltaik: "2495",
  Windkraft: "2497",
  Wasserkraft: "2498",
  Biomasse: "2493",
};

const stateCodes: FilterCodeMap = {
  "Baden-Württemberg": "1402",
  Bayern: "1403",
  Berlin: "1401",
  Brandenburg: "1400",
  Bremen: "1404",
  Hamburg: "1406",
  Hessen: "1405",
  "Mecklenburg-Vorpommern": "1407",
  Niedersachsen: "1408",
  "Nordrhein-Westfalen": "1409",
  "Rheinland-Pfalz": "1410",
  Saarland: "1412",
  Sachsen: "1413",
  "Sachsen-Anhalt": "1414",
  "Schleswig-Holstein": "1411",
  Thüringen: "1415",
};

// Create server instance
const server = new McpServer({
  name: "mastr-mcp",
  version: "1.0.0",
});

// Register mastr tools
server.registerTool(
  "get-sums",
  {
    title: "MaStR-Leistung",
    description:
      "Liefert die installierte Leistung von erneuerbaren Energieträgern (Windkraft, Wasserkraft, Biomasse und Photovoltaik) in Deutschland. Bei Photovoltaik gilt: Die Bruttoleistung ist die Leistung der PV-Module, die Nettoleistung ist die Leistung aller Wechselrichter zusammen.",
    inputSchema: {
      type: z
        .enum(["Photovoltaik", "Windkraft", "Wasserkraft", "Biomasse"])
        .describe("Energieträger, Energiequelle, Art der Erzeugung"),
      state: z
        .enum([
          "Baden-Württemberg",
          "Bayern",
          "Berlin",
          "Brandenburg",
          "Bremen",
          "Hamburg",
          "Hessen",
          "Mecklenburg-Vorpommern",
          "Niedersachsen",
          "Nordrhein-Westfalen",
          "Rheinland-Pfalz",
          "Saarland",
          "Sachsen",
          "Sachsen-Anhalt",
          "Schleswig-Holstein",
          "Thüringen",
        ])
        .optional()
        .describe("Bundesland, in dem sich die Anlagen befinden"),
      plz: z.string().optional().describe("Postleitzahl der Anlagen"),
      county: z
        .string()
        .optional()
        .describe("Landkreis oder Region, in der die Anlagen stehen"),
    },
  },
  async ({ type, plz, county, state }) => {
    let stateFilter = state
      ? "~and~Bundesland~eq~%27" + stateCodes[state] + "%27"
      : "";

    let countyFilter = county ? "~and~Landkreis~ct~%27" + county + "%27" : "";
    let plzFilter = plz ? "~and~Postleitzahl~eq~%27" + plz + "%27" : "";
    let typeFilter =
      "~and~Energietr%C3%A4ger~eq~%27" + energyTypeCodes[type] + "%27";

    const mastrUrl =
      `${MASTR_API_BASE}/Einheit/EinheitJson/GetSummenDerLeistungswerte?gridName=extSEE&filter=Betriebs-Status~eq~%2735%27` +
      countyFilter +
      typeFilter +
      plzFilter +
      stateFilter;
    const mastrData = await mastrRequest<any>(mastrUrl);

    return {
      content: [
        {
          type: "text",
          text:
            "Bruttoleistung: " +
            mastrData.bruttoleistungSumme +
            " kW \n Nettoleistung: " +
            mastrData.nettoleistungSumme +
            " kW \n",
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info("MaStR MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
