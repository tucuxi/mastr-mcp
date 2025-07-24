import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Create server instance
const server = new McpServer({
  name: "ntp-mcp",
  version: "1.0.0",
});

server.registerTool(
  "get-time",
  {
    description:
      "Frage Datum und Zeit bei der Physikalisch-Technischen Bundesanstalt ab.",
  },
  async () => {
    const NTPClient = require("@destinationstransfers/ntp");
    const date = await NTPClient.getNetworkTime({ server: "ptbtime1.ptb.de" });

    return {
      content: [
        {
          type: "text",
          text: "Aktuelles Datum: " + date,
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.info("NTP MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
