import type { APIRoute } from "astro";
import { portfolioMarkdown } from "../content/plain";

// Until the site has a domain set in astro.config.mjs, link home relatively.
export const GET: APIRoute = ({ site }) =>
  new Response(portfolioMarkdown(site ? new URL("/", site).href : "/"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
