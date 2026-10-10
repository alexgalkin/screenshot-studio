import { BASE_URL } from "@/lib/agents/site-content";

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Screenshot Studio",
    version: "1.0.0",
    summary: "Screenshot Studio is a static browser application.",
    description:
      "Screenshot Studio does not expose an HTTP API. Image editing, still export, video encoding, and background removal run in the browser from files shipped with the site. Machine-readable notes about the pages live at /llms.txt.",
    contact: {
      name: "Screenshot Studio",
      url: `${BASE_URL}/contact`,
      email: "kartik.labhshetwar@gmail.com",
    },
    license: {
      name: "Apache-2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
    },
  },
  servers: [{ url: BASE_URL, description: "Static site" }],
  paths: {},
  components: { schemas: {} },
};
