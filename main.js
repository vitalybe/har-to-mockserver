const fs = require("fs");
const _ = require("lodash");
const url = require("url");
const mkdirRecursive = require('mkdir-recursive');
const path = require("path");
const endOfLine = require('os').EOL;

const content = fs.readFileSync("har/test1.har", "utf8");
//const content = fs.readFileSync("har/test2.har", "utf8");


const har = JSON.parse(content);
const entries = har.log.entries;

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
  console.log("Processing: " + entryUrl)
  const parsedUrl = url.parse(entryUrl);
  const directory = path.join("mockserver", parsedUrl.pathname);

  const method = entry.request.method;

  const headerStatus = "HTTP/1.1 " + entry.response.status;
  const headerContentType = "Content-Type: " + getContentTypeHeader(entry).value;
  const content = entry.response.content.text;
  const fileContent = headerStatus + endOfLine + headerContentType + endOfLine + endOfLine + content;

  mkdirRecursive.mkdirSync(directory);
  fs.writeFileSync(path.join(directory, method + ".mock"), fileContent);

});
