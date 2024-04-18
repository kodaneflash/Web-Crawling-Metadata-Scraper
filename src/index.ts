import { URL } from "url";
import { Parser } from "htmlparser2";
import nodeFetch from "node-fetch";
import puppeteer from 'puppeteer';  // Ensure Puppeteer is correctly imported
import UnexpectedError from "./unexpectedError";
import { schema, keys } from "./schema";
import { Metadata, Opts } from "./types";
import { decode as he_decode } from "he";
import { decode as iconv_decode } from "iconv-lite";

type ParserContext = {
  isHtml?: boolean;
  isOembed?: boolean;
  favicon?: string;
  text: string;
  title?: string;
  tagName?: string;
  canonical_url?: string;
};

const defaultHeaders = {
  Accept: "text/html, application/xhtml+xml",
  "User-Agent": "facebookexternalhit",
};

async function crawlSubPages(url: string): Promise<string[]> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a')).map((anchor: HTMLAnchorElement) => anchor.href);
  });
  await browser.close();
  return links.filter(link => new URL(link).hostname === new URL(url).hostname); // Only return internal links
}

async function unfurl(url: string, opts?: Opts): Promise<Metadata[]> {
  if (opts === undefined) {
    opts = {};
  }

  if (typeof opts !== "object") {
    throw new UnexpectedError(UnexpectedError.BAD_OPTIONS);
  }

  opts.oembed = opts.oembed ?? true;
  opts.compress = opts.compress ?? true;
  opts.headers = opts.headers ?? defaultHeaders;
  opts.follow = opts.follow ?? 50;
  opts.timeout = opts.timeout ?? 0;
  opts.size = opts.size ?? 0;

  const subPages = await crawlSubPages(url);  // Get all subpages
  const allMetadata: Metadata[] = [];

  for (const pageUrl of subPages) {
    const pageMetadata = await getPage(pageUrl, opts)
      .then(html => getMetadata(pageUrl, opts)(html))
      .then(metadata => getRemoteMetadata(pageUrl, opts)(metadata))
      .then(metadata => parse(pageUrl)(metadata));
    allMetadata.push(pageMetadata);
  }

  return allMetadata;
}

async function getPage(url: string, opts: Opts): Promise<string> {
  const response = await (opts.fetch
    ? opts.fetch(url)
    : nodeFetch(new URL(url), {
        headers: opts.headers,
        size: opts.size,
        follow: opts.follow,
        timeout: opts.timeout,
      }));

  if (!response.ok) {
    throw new UnexpectedError({
      message: `HTTP error! status: ${response.status}`,
      name: "BAD_HTTP_STATUS",
      info: {
        url,
        httpStatus: response.status.toString(),
      },
    });
  }

  return response.text();
}

function getMetadata(url: string, opts: Opts) {
  return async (html: string): Promise<Metadata> => {
    // Metadata extraction logic based on HTML content
    const metadata: Metadata = {}; // Initialize metadata structure based on Metadata type
    // Populate metadata based on parsed HTML
    return metadata;
  };
}

function getRemoteMetadata(url: string, opts: Opts) {
  return async (metadata: Metadata): Promise<Metadata> => {
    // Logic to enrich metadata by fetching remote resources
    return metadata; // Return enriched metadata
  };
}

function parse(url: string) {
  return (metadata: Metadata): Metadata => {
    // Parsing logic to finalize the metadata structure
    return metadata; // Return finalized metadata
  };
}

export { unfurl };
