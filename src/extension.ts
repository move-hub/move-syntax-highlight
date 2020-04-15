// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as Parser from 'web-tree-sitter';
import * as path from 'path';
import * as fs from 'fs';


async function initParser() {
  await Parser.init();
  let moveParser = new Parser();
  const moveParserWasmFile = path.join(__dirname, '../parsers/move.wasm');
  moveParser.setLanguage(await Parser.Language.load(moveParserWasmFile));
  return moveParser;
}

function readQuerySource(): string {
  const queryFile = path.join(__dirname, "../queries/highlights.scm");
  return fs.readFileSync(queryFile).toString();
}

class MoveParseTrees {
  parser: Parser;
  query: any;
  docTrees: { [doc: string]: { tree: Parser.Tree, version: number } } = {};

  constructor(parser: Parser, querySource: string) {
    this.parser = parser;
    this.query = this.parser.getLanguage().query(querySource);
  }

  addDoc(doc: vscode.TextDocument) {
    const docUri = doc.uri.toString();
    // new doc
    if (!this.docTrees[docUri]) {
      let tree = this.parser.parse(doc.getText());
      this.docTrees[docUri] = { tree: tree, version: doc.version };
    }
    // version outdated
    if (this.docTrees[docUri]!.version < doc.version) {
      let tree = this.parser.parse(doc.getText());
      this.docTrees[docUri] = { tree: tree, version: doc.version };
    }
  }

  editDoc(edit: vscode.TextDocumentChangeEvent) {
    let doc = edit.document;
    let contentChanges = edit.contentChanges;

    const docId = doc.uri.toString();
    if (!this.docTrees[docId]) {
      let tree = this.parser.parse(doc.getText());
      this.docTrees[docId] = { tree, version: doc.version };
      return;
    }

    if (doc.version <= this.docTrees[docId].version) {
      return;
    }
    const old = this.docTrees[docId]!.tree;
    for (const e of contentChanges) {
      const startIndex = e.rangeOffset;
      const oldEndIndex = e.rangeOffset + e.rangeLength;
      const newEndIndex = e.rangeOffset + e.text.length;
      const startPos = doc.positionAt(startIndex);
      const oldEndPos = doc.positionAt(oldEndIndex);
      const newEndPos = doc.positionAt(newEndIndex);
      const startPosition = asPoint(startPos)
      const oldEndPosition = asPoint(oldEndPos)
      const newEndPosition = asPoint(newEndPos)
      const delta = {
        startIndex,
        oldEndIndex,
        newEndIndex,
        startPosition,
        oldEndPosition,
        newEndPosition
      };
      old.edit(delta);
    }
    const newTree = this.parser.parse(doc.getText(), old);
    this.docTrees[docId] = { tree: newTree, version: doc.version };
  }

  dropDoc(docUri: string) {
    if (this.docTrees[docUri]) {
      this.docTrees[docUri].tree.delete();
      delete this.docTrees[docUri];
    }
  }

  delete() {
    for (const doc in this.docTrees) {
      this.docTrees[doc].tree.delete();
    }
    this.query.delete();
    this.parser.delete();
  }
}

function asPoint(pos: vscode.Position): Parser.Point {
  return { row: pos.line, column: pos.character }
}

function asPosition(point: Parser.Point): vscode.Position {
  return new vscode.Position(point.row, point.column);
}

let parseTrees: MoveParseTrees | undefined = undefined;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('activate move-syntax-highlight!');

  parseTrees = new MoveParseTrees(await initParser(), readQuerySource());

  let tokenTypes: Set<string> = new Set();
  let tokenModifiers: Set<string> = new Set();
  for (const captureName of parseTrees.query.captureNames) {
    let parts = captureName.split('.');
    let tokenType = parts.shift();

    tokenTypes.add(tokenType);
    for (let m of parts) {
      tokenModifiers.add(m);
    }
  }

  let legend = new vscode.SemanticTokensLegend([...tokenTypes], [...tokenModifiers]);
  let semanticTokensProvider = new MoveSemanticTokensProvider(legend);
  context.subscriptions.push(vscode.languages.registerDocumentSemanticTokensProvider(
    { language: 'move' },
    semanticTokensProvider,
    semanticTokensProvider.legend
  ));
  context.subscriptions.push(vscode.languages.registerDocumentRangeSemanticTokensProvider(
    { language: 'move' },
    semanticTokensProvider,
    semanticTokensProvider.legend
  ));

  function openDocHandler(doc: vscode.TextDocument) {
    if (doc.languageId !== 'move') {
      return;
    }
    parseTrees!.addDoc(doc);
  }
  function closeDocHandler(doc: vscode.TextDocument) {
    if (doc.languageId !== 'move') {
      return;
    }
    parseTrees!.dropDoc(doc.uri.toString());
  }
  function changeDocHandler(evt: vscode.TextDocumentChangeEvent) {
    if (evt.document.languageId !== 'move') {
      return;
    }
    parseTrees!.editDoc(evt);
  }
  vscode.workspace.onDidOpenTextDocument(openDocHandler, null, context.subscriptions);
  vscode.workspace.onDidCloseTextDocument(closeDocHandler, null, context.subscriptions);
  vscode.workspace.onDidChangeTextDocument(changeDocHandler, null, context.subscriptions);

  for (let editor of vscode.window.visibleTextEditors) {
    if (editor.document.languageId === 'move') {
      parseTrees.addDoc(editor.document);
    }
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
  parseTrees?.delete();
}

class MoveSemanticTokensProvider implements vscode.DocumentSemanticTokensProvider, vscode.DocumentRangeSemanticTokensProvider {
  legend: vscode.SemanticTokensLegend;
  constructor(legend: vscode.SemanticTokensLegend) {
    this.legend = legend;
  }


  provideDocumentRangeSemanticTokens(document: vscode.TextDocument, range: vscode.Range, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens> {
    return this.provideTokens(document, range);
  }
  provideDocumentSemanticTokens(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.SemanticTokens> {
    return this.provideTokens(document);
  }

  private provideTokens(document: vscode.TextDocument, range?: vscode.Range): vscode.SemanticTokens {
    parseTrees!.addDoc(document);

    let query = parseTrees!.query;
    let docTree = parseTrees!.docTrees[document.uri.toString()];
    if (document.version < docTree!.version) {
      throw new Error('Busy');
    }

    let startPosition = range?.start;
    let endPosition = range?.end;
    let startPoint = startPosition ? asPoint(startPosition) : undefined;
    let endPoint = endPosition ? asPoint(endPosition) : undefined;

    let rootNode = docTree.tree.rootNode;
    let captures = query.captures(rootNode, startPoint, endPoint);

    // if no modifiers, we can push token directly (to prevent extra iterations).
    const hasModifiers = this.legend.tokenModifiers.length != 0;

    let mergedTokens = new Map();
    let tokenBuilder = new vscode.SemanticTokensBuilder(this.legend);
    for (const capture of captures) {
      let captureName: string = capture.name;
      let parts = captureName.split('.');
      let tokenType = parts.shift()!;
      let node: Parser.SyntaxNode = capture.node;
      let range = new vscode.Range(asPosition(node.startPosition), asPosition(node.endPosition));
      if (hasModifiers) {
        let prev = mergedTokens.get(range);
        if (prev) {
          // prev modifiers is less than current
          if (prev[1].length < parts.length) {
            mergedTokens.set(range, [tokenType, parts]);
          }
        } else {
          mergedTokens.set(range, [tokenType, parts]);
        }
      } else {
        tokenBuilder.push(range, tokenType, parts);
      }
    }

    if (hasModifiers) {
      for (const [range, [tokenType, tokenModifiers]] of mergedTokens) {
        tokenBuilder.push(range, tokenType, tokenModifiers);
      }
    }

    let tokens = tokenBuilder.build();
    return tokens;
  }
}