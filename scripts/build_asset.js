#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const parsersDir = __dirname + "/../parsers";
if (!fs.existsSync(parsersDir)) {
  fs.mkdirSync(parsersDir);
}

const parserModulePath = "node_modules/@movei/tree-sitter-move";
build_wasm("move", parserModulePath);

function build_wasm(lang, modulePath) {
  let output = "tree-sitter-" + lang + ".wasm";
  console.log("Compiling " + lang + " parser");
  exec("node_modules/.bin/tree-sitter build-wasm " + modulePath,
    (err) => {
      if (err) { console.log("Failed to build wasm for " + lang + ": " + err.message); }
      else {
        fs.rename(output, "parsers/" + lang + ".wasm",
          (err) => {
            if (err) { console.log("Failed to copy built parser: " + err.message); }
            else { console.log("Successfully compiled " + lang + " parser"); }
          });
      }
    });

}
