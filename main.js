#!/usr/bin/env node

const fs = require("fs");
const _ = require("lodash");
const url = require("url");
const mkdirRecursive = require("mkdir-recursive");
const path = require("path");
const endOfLine = require("os").EOL;
const commandLineArgs = require("command-line-args");

function getContentTypeHeader(entry) {
  const responseHeaders = entry.response.headers;
  return responseHeaders.find(header => header.name.toLowerCase() === "content-type");
}

function filterInContentType(entries, type) {
  return entries.filter(entry => {
    const contentHeader = getContentTypeHeader(entry);
    return contentHeader && contentHeader.value.toLowerCase().startsWith(type);
  });
}

function filterOutUrl(entries, regex) {
  return entries.filter(entry => !entry.request.url.match(regex));
}

function processHar(harPath) {
  const content = fs.readFileSync(harPath.filename, "utf8");
  const har = JSON.parse(content);
  const entries = har.log.entries;

  let filteredEntries = entries;
//filteredEntries = filterInContentType(filteredEntries, "application/json");
  filteredEntries = filterOutUrl(filteredEntries, /\.js$/);
  filteredEntries = filterOutUrl(filteredEntries, /\.png$/);
  filteredEntries = filterOutUrl(filteredEntries, /\.ttf$/);
  filteredEntries = filterOutUrl(filteredEntries, /\.css$/);
  filteredEntries = filterOutUrl(filteredEntries, /\.gif$/);
  filteredEntries = filterOutUrl(filteredEntries, /\.ico$/);
  filteredEntries = filterOutUrl(filteredEntries, /\.html$/);

  _.sortBy(filteredEntries, entry => entry.request.url).forEach(entry => {
    const entryUrl = entry.request.url;
    console.log("Processing: " + entryUrl);
    const parsedUrl = url.parse(entryUrl);
    const directory = path.join("mockserver", parsedUrl.pathname);

    const method = entry.request.method;

    const headers = [
      "HTTP/1.1 " + entry.response.status,
      "Content-Type: " + getContentTypeHeader(entry).value,
      "Access-Control-Allow-Origin: *",
      "Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS",
    ];
    const content = entry.response.content.text;

    const fileContent = headers.join(endOfLine) + endOfLine + endOfLine + content;

    mkdirRecursive.mkdirSync(directory);
    fs.writeFileSync(path.join(directory, method + ".mock"), fileContent);
  });
}

class FileDetails {
  constructor(filename) {
    this.filename = filename;
    this.exists = fs.existsSync(filename);
  }
}

const optionDefinitions = [{ name: "har", type: filename => new FileDetails(filename), defaultOption: true }];
const options = commandLineArgs(optionDefinitions);
if(!options.har || !options.har.exists) {
  console.log("Please provide existing har file name, e.g: har-to-mockserver path/to/file.har")
} else {
  processHar(options.har)
}

