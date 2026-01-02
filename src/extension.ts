import * as vscode from "vscode";

/*************************************/
/* Map de errores -> imágenes        */
/*************************************/
const IMAGE_MAP: Record<string, string> = {
  no_error: 'no_error.jpeg',
  not_a_function: 'not_a_function.jpeg',
  cannot_read_property: 'cannot_read_property.jpeg',
  not_defined: 'not_defined.jpeg',
  syntax_error: 'syntax_error.jpeg',
  module_not_found: 'module_not_found.jpeg',
  type_error: 'type_error.jpeg',
  file_not_found: 'file_not_found.jpeg',
  typescript_types: 'typescript.jpeg',
  unknown: 'unknown.jpeg',
  range_error: 'range_error.jpeg',
  eval_error: 'eval_error.jpeg',
  uri_error: 'uri_error.jpeg',
  python: 'python.jpeg',
  java: 'java.jpeg',
  go: 'go.jpeg',
  rust: 'rust.jpeg',
  csharp: 'csharp.jpeg'
};

/*************************************/
/* Obtener URI de imagen             */
/*************************************/
async function getImageUriForKey(
  key: string,
  extensionUri: vscode.Uri
): Promise<vscode.Uri | undefined> {
  const filename = IMAGE_MAP[key];
  if (filename) {
    try {
      const uri = vscode.Uri.joinPath(extensionUri, 'media', filename);
      try {
        await vscode.workspace.fs.stat(uri);
        console.log(`Image found for key "${key}": ${uri.toString()}`);
        OUTPUT?.appendLine(`Image found for key "${key}": ${uri.toString()}`);
        return uri;
      } catch (err) {
        console.warn(`Image file not found for key "${key}": ${uri.toString()}`);
        OUTPUT?.appendLine(`Image file not found for key "${key}": ${uri.toString()}`);
      }
    } catch (err) {}
  }

  // fallback to 'unknown' if available (avoid infinite recursion)
  if (key !== 'unknown') {
    return getImageUriForKey('unknown', extensionUri);
  }

  return undefined;
}

// Collector for unknown/uncategorized messages (keeps local counts for triage)
const UNKNOWN_COUNTERS: Map<string, number> = new Map();

// Built-in, inline error list (preferred source now)
export type ErrorEntry = { pattern: string; key: string; message: string; image?: string; matchType?: 'regex' | 'substring' | 'exact' };
export const ERROR_LIST: ErrorEntry[] = [
  // Property access / null / undefined
  { pattern: "cannot read (?:properties|property).* of (?:undefined|null)", key: "cannot_read_property", message: "😳 Parece que estás intentando acceder o modificar algo que no existe (null/undefined).", image: "cannot_read_property", matchType: 'regex' },
  { pattern: "cannot set properties of (?:null|undefined)", key: "type_error", message: "⚠️ Intentaste modificar algo que no existe (null/undefined).", image: "type_error", matchType: 'regex' },

  // Function / callable
  { pattern: "is not a function", key: "not_a_function", message: "😵 O-oye… estás intentando usar algo como función, pero no lo es.", image: "not_a_function", matchType: 'regex' },  // Common TypeError variants with prefixes or stack traces
  { pattern: "typeerror\s*:\s*.*is not a function", key: "not_a_function", message: "😵 O-oye… estás intentando usar algo como función, pero no lo es.", image: "not_a_function", matchType: 'regex' },
  { pattern: "is not a function(?:\s|$)", key: "not_a_function", message: "😵 O-oye… estás intentando usar algo como función, pero no lo es.", image: "not_a_function", matchType: 'regex' },  { pattern: "is not callable|is not callable\.|not callable", key: "not_defined", message: "🤔 Estás usando una variable que no fue declarada o no está en el alcance.", image: "not_defined", matchType: 'regex' },
  { pattern: "has no call signatures", key: "not_defined", message: "🤔 Estás llamando algo que no es una función (sin firmas de llamada).", image: "not_defined", matchType: 'substring' },
  { pattern: "type .* has no call signatures", key: "not_defined", message: "🤔 Estás llamando algo que no es una función (sin firmas de llamada).", image: "not_defined", matchType: 'regex' },

  // Python common errors (moved before generic undefined/reference)
  { pattern: "traceback \(most recent call last\)", key: "python_traceback", message: "🐍 Hay un traceback de Python — revisa la traza y el tipo de excepción (NameError, AttributeError, TypeError, etc.).", image: "python", matchType: 'regex' },
  { pattern: "nameerror: .* is not defined", key: "python_name_error", message: "🤔 Nombre no definido en Python (NameError) — verifica la variable o importación.", image: "python", matchType: 'regex' },
  { pattern: "attributeerror: '.*' object has no attribute '.*'", key: "python_attribute_error", message: "⚠️ AttributeError — intentas acceder a un atributo que no existe.", image: "python", matchType: 'regex' },
  { pattern: "typeerror: .* not callable", key: "python_type_error", message: "😵 Intentas llamar algo que no es invocable en Python.", image: "python", matchType: 'regex' },

  // Undefined / Reference
  { pattern: "is not defined|referenceerror|cannot find name", key: "not_defined", message: "🤔 Estás usando una variable que no fue declarada o no está en el alcance.", image: "not_defined", matchType: 'regex' },

  // Syntax
  { pattern: "unexpected token|syntax error|unterminated string literal", key: "syntax_error", message: "⚠️ Hay un error de sintaxis. Revisa la estructura de tu código — puede faltar un paréntesis, llave o haber un token inesperado.", image: "syntax_error", matchType: 'regex' },
  { pattern: "missing \)|missing ; before statement|missing \) after argument list", key: "syntax_error", message: "⚠️ Posible error de sintaxis (falta paréntesis/punto y coma).", image: "syntax_error", matchType: 'substring' },

  // Modules
  { pattern: "cannot find module|module not found|cannot find package", key: "module_not_found", message: "📦 No se encontró un módulo importado — verifica el nombre o instala la dependencia.", image: "module_not_found", matchType: 'regex' },
  { pattern: "cannot use import statement outside a module", key: "module_not_found", message: "📦 Imports no válidos fuera de módulo — revisa configuración del proyecto.", image: "module_not_found", matchType: 'substring' },

  // Filesystem
  { pattern: "enoent: no such file or directory|no such file or directory|file not found", key: "file_not_found", message: "No se encontró un archivo o recurso necesario. Verifica rutas y nombres.", image: "file_not_found", matchType: 'regex' },

  // Type/JS errors
  { pattern: "typeerror", key: "type_error", message: "⚠️ Hay un TypeError — revisa que estés usando valores del tipo correcto.", image: "type_error", matchType: 'substring' },
  { pattern: "is not iterable|object is not iterable|not iterable", key: "type_error", message: "⚠️ Estás intentando iterar algo no iterable.", image: "type_error", matchType: 'regex' },

  // Range / Eval / URI
  { pattern: "rangeerror", key: "range_error", message: "RangeError — revisa valores fuera de rango.", image: "range_error", matchType: 'substring' },
  { pattern: "evalerror", key: "eval_error", message: "EvalError — algo falló durante eval().", image: "eval_error", matchType: 'substring' },
  { pattern: "urierror", key: "uri_error", message: "URIError — error con URI o encode/decode.", image: "uri_error", matchType: 'substring' },

  // TypeScript specific
  { pattern: "type annotations", key: "typescript_types", message: "🛠️ Pareces estar usando anotaciones de TypeScript en un archivo .js.", image: "typescript_types", matchType: 'substring' },
  { pattern: "type annotations can only be used in typescript files", key: "typescript_types", message: "🛠️ Pareces estar usando anotaciones de TypeScript en un archivo .js.", image: "typescript_types", matchType: 'regex' },
  { pattern: "ts\\d{3}", key: "typescript_types", message: "🛠️ Parece que estás viendo un error de TypeScript (TSxxx). Revisa la definición o el archivo .ts.", image: "typescript_types", matchType: 'regex' },



  // Java common exceptions
  { pattern: "java\.lang\.nullpointerexception", key: "java_null_pointer", message: "☠️ NullPointerException — hay una referencia nula en Java.", image: "java", matchType: 'regex' },
  { pattern: "classnotfoundexception|cannot find symbol", key: "java_class_not_found", message: "📦 Clase o símbolo no encontrado en Java — verifica imports y compilación.", image: "java", matchType: 'regex' },

  // Go common errors
  { pattern: "panic: runtime error: index out of range", key: "go_index_out_of_range", message: "⚠️ Panic en Go por índice fuera de rango.", image: "go", matchType: 'substring' },
  { pattern: "undefined: \w+", key: "go_undefined", message: "🤔 Identificador no definido en Go — posiblemente falta importar o declarar.", image: "go", matchType: 'regex' },

  // Rust common errors
  { pattern: "panicked at 'index out of bounds'", key: "rust_index_oob", message: "⚠️ Panic en Rust por índice fuera de rango.", image: "rust", matchType: 'substring' },
  { pattern: "error\[: E\d{4}\]|error: cannot find function|unresolved import", key: "rust_compile_error", message: "🦀 Error de compilación de Rust — revisa la firma o imports.", image: "rust", matchType: 'regex' },

  // C# / .NET
  { pattern: "system\.nullreferenceexception", key: "csharp_null_ref", message: "☠️ NullReferenceException — referencia nula en C#.", image: "csharp", matchType: 'regex' },
  { pattern: "cs\d{4}", key: "csharp_compiler", message: "🛠️ Error de compilador C# (CSxxxx). Revisa el código y las referencias.", image: "csharp", matchType: 'regex' },

  // Helpful fallback
  { pattern: "cannot read property 'push' of null|cannot read property 'push' of undefined", key: "cannot_read_property", message: "😳 Intentaste manipular una referencia null/undefined.", image: "cannot_read_property", matchType: 'regex' }
];

// Runtime custom mappings support removed per owner request.
// Mappings are now managed directly in the extension source (`ERROR_LIST`) by the project owner.

function normalizeMessage(msg: string): string {
  if (!msg) { return ''; }
  let s = String(msg);
  // remove quoted substrings ('foo', "bar", `baz`) and parenthesized details
  s = s.replace(/(["'`]).*?\1/g, '');
  s = s.replace(/\([^)]*\)/g, '');
  // collapse whitespace and lowercase (keep numbers/paths to preserve useful context)
  s = s.replace(/\s+/g, ' ').trim().toLowerCase();
  return s;
}

function recordUnknown(msg: string) {
  const norm = normalizeMessage(msg);
  if (!norm) { return; }
  const c = UNKNOWN_COUNTERS.get(norm) || 0;
  UNKNOWN_COUNTERS.set(norm, c + 1);
  OUTPUT?.appendLine(`Unknown error occurrence: ${norm} (count=${c + 1})`);
  console.log('Unknown error occurrence:', norm, c + 1);
}
/*************************************
/* Traductor de errores              */
/*************************************/
export function translateError(message: string): string {
  return translateErrorWithMeta(message).message;
}

export function translateErrorWithMeta(message: string, opts?: { code?: string | number; source?: string }): { key: string; message: string; imageKey?: string } {
  const msg = (message || '');
  const msgLower = msg.toLowerCase();
  const code = opts?.code ? String(opts.code) : undefined;
  const codeStr = code ? String(code).toLowerCase() : undefined;
  const source = opts?.source ? String(opts.source) : undefined;
  const sourceLower = source ? source.toLowerCase() : undefined;

  const debug = !!vscode.workspace.getConfiguration().get<boolean>('anime-error-translator.debug');
  let patternsTested = 0;

  // Quick check: diagnostic TS codes should map to TypeScript category
  if (code && /ts\d{3}/i.test(String(code))) {
    OUTPUT?.appendLine(`TS diagnostic code detected: ${code}`);
    console.log('TS diagnostic code detected:', code);
    return { key: 'typescript_types', message: "🛠️ Parece que estás viendo un error de TypeScript (TSxxx). Revisa la definición o el archivo .ts." };
  }

  // Safeguard: some TypeScript messages are more naturally detected by a short phrase
  if (msgLower.includes('type annotations') || msgLower.includes('type annotation')) {
    OUTPUT?.appendLine('Matched TypeScript phrase via substring fallback');
    return { key: 'typescript_types', message: "🛠️ Pareces estar usando anotaciones de TypeScript en un archivo .js." };
  }

  // Search inline ERROR_LIST first (use original message, source, and code) — normalizeMessage is reserved for fallback triage
  for (const e of ERROR_LIST) {
    patternsTested++;
    const pat = e.pattern;
    const mt = e.matchType || 'regex';

    try {
      if (mt === 'exact') {
        if (msg === pat || msgLower === pat.toLowerCase() || (source && source === pat) || (code && code === pat)) {
          OUTPUT?.appendLine(`Matched exact ERROR_LIST: ${e.key} pattern=${pat}`);
          return { key: e.key, message: e.message, imageKey: e.image };
        }
      } else if (mt === 'substring') {
        const p = pat.toLowerCase();
        if (msgLower.includes(p) || (sourceLower && sourceLower.includes(p)) || (codeStr && codeStr.includes(p))) {
          OUTPUT?.appendLine(`Matched substring ERROR_LIST: ${e.key} pattern=${pat}`);
          return { key: e.key, message: e.message, imageKey: e.image };
        }
      } else {
        // regex match
        const re = new RegExp(pat, 'i');
        if (re.test(msg) || (source && re.test(source)) || (code && re.test(String(code)))) {
          OUTPUT?.appendLine(`Matched regex ERROR_LIST: ${e.key} pattern=${pat}`);
          return { key: e.key, message: e.message, imageKey: e.image };
        }
      }
      if (debug) { OUTPUT?.appendLine(`Tried ERROR_LIST ${e.key} (${mt}) with pattern=${pat} — no match`); }
    } catch (err) {
      if (debug) { OUTPUT?.appendLine(`ERROR testing pattern ${e.key}: ${pat} — ${String(err)}`); }
      // continue to next pattern
    }
  }

  // Runtime custom mappings support removed — only built-in `ERROR_LIST` and fallback `PATTERNS` are used.

  // Fallback PATTERNS (robust regexes)
  const PATTERNS: Array<{ key: string; re: RegExp; message: string }> = [
    { key: 'cannot_read_property', re: /cannot read (?:properties|property).* of (?:undefined|null)|cannot set properties of (?:null|undefined)/i, message: "😳 Parece que estás intentando acceder o modificar algo que no existe (null/undefined)." },
    { key: 'not_a_function', re: /is not a function/i, message: "😵 O-oye… estás intentando usar algo como función, pero no lo es." },
    { key: 'not_defined', re: /is not defined|referenceerror|cannot find name|has no call signatures|is not callable/i, message: "🤔 Estás usando una variable que no fue declarada o no está en el alcance." },
    { key: 'syntax_error', re: /unexpected token|syntax error|unterminated string literal|missing \)|missing ; before statement/i, message: "⚠️ Hay un error de sintaxis. Revisa la estructura de tu código — puede faltar un paréntesis, llave o haber un token inesperado." },
    { key: 'module_not_found', re: /cannot find module|module not found|cannot find package|cannot use import statement outside a module/i, message: "📦 No se encontró un módulo importado — verifica el nombre o instala la dependencia." },
    { key: 'file_not_found', re: /enoent: no such file or directory|no such file or directory|file not found/i, message: "No se encontró un archivo o recurso necesario. Verifica rutas y nombres." },
    { key: 'typescript_types', re: /ts\d{3}/i, message: "🛠️ Parece que estás viendo un error de TypeScript (TSxxx). Revisa la definición o el archivo .ts." },
    { key: 'type_error', re: /typeerror|is not iterable|not iterable/i, message: "⚠️ Hay un TypeError — revisa que estés usando valores del tipo correcto." },
    { key: 'range_error', re: /rangeerror/i, message: "RangeError — revisa valores fuera de rango." },
    { key: 'eval_error', re: /evalerror/i, message: "EvalError — algo falló durante eval()." },
    { key: 'uri_error', re: /urierror/i, message: "URIError — error con URI o encode/decode." },
    // Python / Java / Go / Rust / C# fallback patterns
    { key: 'python_traceback', re: /traceback \(most recent call last\)|^Traceback/i, message: "🐍 Hay un traceback de Python — revisa la traza y el tipo de excepción (NameError, AttributeError, TypeError, etc.)." },
    { key: 'python_nameerror', re: /nameerror\s*:\s*.*is not defined/i, message: "🤔 Nombre no definido en Python (NameError) — verifica la variable o importación." },
    { key: 'python_attribute', re: /attributeerror\s*:\s*'.*' object has no attribute '.+'/i, message: "⚠️ AttributeError — intentas acceder a un atributo que no existe." },
    { key: 'java_npe', re: /java\.lang\.NullPointerException/i, message: "☠️ NullPointerException — hay una referencia nula en Java." },
    { key: 'java_class', re: /classnotfoundexception|cannot find symbol/i, message: "📦 Clase o símbolo no encontrado en Java — verifica imports y compilación." },
    { key: 'go_panic_index', re: /panic: runtime error: index out of range/i, message: "⚠️ Panic en Go por índice fuera de rango." },
    { key: 'go_undefined', re: /undefined: \w+/i, message: "🤔 Identificador no definido en Go — posiblemente falta importar o declarar." },
    { key: 'rust_panic', re: /panicked at 'index out of bounds'|thread '.*' panicked at/i, message: "⚠️ Panic en Rust — revisa la traza y valores." },
    { key: 'rust_compile', re: /error\[E\d{4}\]|unresolved import/i, message: "🦀 Error de compilación de Rust — revisa la firma o imports." },
    { key: 'csharp_nre', re: /system\.nullreferenceexception/i, message: "☠️ NullReferenceException — referencia nula en C#." },
    { key: 'csharp_cs', re: /CS\d{4}/i, message: "🛠️ Error de compilador C# (CSxxxx). Revisa el código y las referencias." }
  ];

  for (const p of PATTERNS) {
    patternsTested++;
    try {
      if (p.re.test(msg) || (source && p.re.test(source)) || (code && p.re.test(String(code)))) {
        OUTPUT?.appendLine(`Matched fallback PATTERNS: ${p.key} pattern=${p.re}`);
        console.log('Matched fallback PATTERNS:', p.key, p.re.toString());
        return { key: p.key, message: p.message };
      }
      if (debug) { OUTPUT?.appendLine(`Tried PATTERN ${p.key} (${p.re}) — no match`); }
    } catch (err) {
      if (debug) { OUTPUT?.appendLine(`ERROR testing fallback pattern ${p.key}: ${String(err)}`); }
    }
  }

  // If we reach here, it's unknown. Log and record a normalized form for triage only
  OUTPUT?.appendLine(`Unknown error mapped: ${message} (testedPatterns=${patternsTested})`);
  console.log('Unknown error mapped:', message, 'testedPatterns=', patternsTested);
  const nm = normalizeMessage(message);
  recordUnknown(nm);
  return { key: 'unknown', message: `Ocurrió un error, pero no sé explicarlo: ${message}` };
}

/*************************************/
/* Webview Provider                  */
/*************************************/
class AnimeErrorViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'animeErrorTranslator.view';
  private _view?: vscode.WebviewView;

  private _initialTranslated?: string;
  private _initialOriginal?: string;
  private _initialImage?: vscode.Uri;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this._extensionUri, 'media')]
    };

    // Mostrar HTML con el estado inicial o mensaje por defecto
    const initialTranslated = this._initialTranslated || '— esperando errores —';
    const initialOriginal = this._initialOriginal || '';
    const initialImg = this._initialImage ? webviewView.webview.asWebviewUri(this._initialImage).toString() : undefined;
    webviewView.webview.html = this._getHtml(initialTranslated, initialOriginal, initialImg);

    // Escuchar mensajes desde el webview (botones)
    webviewView.webview.onDidReceiveMessage(async (msg) => {
      if (msg.command === 'copy') {
        try {
          await vscode.env.clipboard.writeText(msg.text || '');
          vscode.window.setStatusBarMessage('📝 Texto copiado', 2000);
        } catch (err) {
          vscode.window.showInformationMessage('No se pudo copiar al portapapeles');
        }
      }
    });
  }

  // Mostrar mensaje traducido + original + imagen
  public async show(translated: string, original?: string, imageFile?: vscode.Uri) {
    OUTPUT?.appendLine(`show() called with translated: ${translated} original: ${original} imageFile: ${imageFile?.toString()}`);
    console.log('show() called with translated:', translated, 'original:', original, 'imageFile:', imageFile?.toString());

    if (!this._view) {
      // Guardar estado inicial si la view aún no exista
      this._initialTranslated = translated;
      this._initialOriginal = original;
      this._initialImage = imageFile;
      OUTPUT?.appendLine('View not yet created, saved as initial state');
      console.log('View not yet created, saved as initial state');
      return;
    }
    const imageSrc = imageFile ? this._view.webview.asWebviewUri(imageFile).toString() : undefined;
    OUTPUT?.appendLine(`Posting update to webview: ${translated} imageSrc: ${imageSrc}`);
    console.log('Posting update to webview', { translated, original, imageSrc });
    try {
      const ok = await this._view.webview.postMessage({ type: 'update', translated, original, imageSrc });
      OUTPUT?.appendLine(`postMessage returned ${ok}`);
      if (!ok) {
        OUTPUT?.appendLine('postMessage returned false — updating webview HTML directly as fallback');
        this._view.webview.html = this._getHtml(translated, original, imageSrc);
      }
    } catch (err) {
      OUTPUT?.appendLine('postMessage failed: ' + String(err) + ' — updating webview HTML directly as fallback');
      console.error('postMessage failed:', err, ' — updating webview HTML directly as fallback');
      try {
        this._view.webview.html = this._getHtml(translated, original, imageSrc);
      } catch (err2) {
        console.error('Fallback HTML update also failed:', err2);
      }
    }
  }

  private _getHtml(translated: string, original?: string, imageSrc?: string) {
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${this._view?.webview.cspSource} data: https:; script-src 'nonce-${nonce}'; style-src ${this._view?.webview.cspSource} 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style nonce="${nonce}">
:root { --card-bg: var(--vscode-editor-background); --accent: var(--vscode-editorInfo-foreground); }
.container { display:flex; flex-direction:column; gap:12px; align-items:stretch; }
.img { width:100%; height:200px; border-radius:8px; overflow:hidden; background:linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.02)); display:flex; align-items:center; justify-content:center; }
.img img { max-width:100%; max-height:100%; object-fit:contain; }
.translated { font-size:1.15rem; font-weight:800; color:var(--vscode-editor-foreground); margin:0; text-align:center; }
.original { font-size:0.9rem; color:var(--vscode-editorHint-foreground); background:transparent; border-radius:4px; margin-top:6px; padding:6px; }
.details summary { cursor:pointer; outline:none; }
.actions { margin-top:8px; display:flex; gap:8px; justify-content:center; }
.action-btn { padding:8px 12px; border-radius:6px; background:var(--vscode-button-background); color:var(--vscode-button-foreground); border:none; cursor:pointer; }
.action-btn:hover { background:var(--vscode-button-hoverBackground); }
</style>
</head>
<body>
<div class="container">
  <div class="img">${imageSrc ? `<img src="${imageSrc}"/>` : '📝'}</div>
  <div class="translated">${escapeHtml(translated)}</div>
  <details class="details">
    <summary>Mensaje original</summary>
    <div class="original"><pre>${escapeHtml(original || '')}</pre></div>
  </details>
  <div class="actions">
    <button class="action-btn" id="copyTranslated">Copiar traducción</button>
    <button class="action-btn" id="copyOriginal">Copiar original</button>
  </div>
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
const copyTranslated = document.getElementById('copyTranslated');
const copyOriginal = document.getElementById('copyOriginal');

console.log('Webview script loaded.');

window.addEventListener('message', event => {
  const data = event.data;
  console.log('Webview received message:', data);
  if (data.type === 'update') {
    document.querySelector('.translated').textContent = data.translated || '';
    document.querySelector('.original pre').textContent = data.original || '';
    if (data.imageSrc) {
      const el = document.querySelector('.img img');
      if (el) { el.src = data.imageSrc; }
      else { const wrapper = document.querySelector('.img'); wrapper.innerHTML = '<img src="' + data.imageSrc + '"/>'; }
    }
  }
});

copyTranslated.addEventListener('click', () => {
  const text = document.querySelector('.translated').textContent || '';
  vscode.postMessage({ command: 'copy', text });
});
copyOriginal.addEventListener('click', () => {
  const text = document.querySelector('.original pre').textContent || '';
  vscode.postMessage({ command: 'copy', text });
});

</script>
</body>
</html>`;
  }
}

/*************************************/
/* Procesar errores y actualizar view*/
/*************************************/
async function processDiagnostics(viewProvider: AnimeErrorViewProvider, extensionUri: vscode.Uri) {
  const diagnostics = vscode.languages.getDiagnostics();
  console.log('processDiagnostics: files with diagnostics', diagnostics.length);
  OUTPUT?.appendLine(`processDiagnostics: files with diagnostics ${diagnostics.length}`);

  for (const [uri, diagnosticList] of diagnostics) {
    for (const diagnostic of diagnosticList) {
      if (diagnostic.severity === vscode.DiagnosticSeverity.Error) {
        const meta = translateErrorWithMeta(diagnostic.message, { code: diagnostic.code ? String(diagnostic.code) : undefined, source: diagnostic.source });
        console.log('processDiagnostics: found error at', uri.toString(), 'message:', diagnostic.message, 'meta:', meta);
        const imageKey = (meta as any).imageKey || meta.key;
        let imageUri = await getImageUriForKey(imageKey, extensionUri);
        if (!imageUri) {
          console.warn(`Image not found for key ${imageKey}, falling back to 'unknown'`);
          imageUri = await getImageUriForKey('unknown', extensionUri);
        }
        viewProvider.show(meta.message, diagnostic.message, imageUri);
        return;
      }
    }
  }

  console.log('processDiagnostics: no errors found, showing no_error state');
  const noErrorImage = await getImageUriForKey('no_error', extensionUri);
  viewProvider.show("✨ Todo está en orden. ¡Sigue así! ✨", '', noErrorImage);
}

/*************************************/
/* Activación / Desactivación        */
/*************************************/
// Output channel for easier debugging and logs
let OUTPUT: vscode.OutputChannel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("Anime Error Translator activado");
  OUTPUT = vscode.window.createOutputChannel('Anime Error Translator');
  OUTPUT.appendLine('Activating Anime Error Translator...');

  const viewProvider = new AnimeErrorViewProvider(context.extensionUri);

  // Registrar la view en Explorer
  const disposable = vscode.window.registerWebviewViewProvider(AnimeErrorViewProvider.viewType, viewProvider);
  context.subscriptions.push(disposable);
  OUTPUT.appendLine(`Webview provider registered for viewType: ${AnimeErrorViewProvider.viewType}`);

  // Comando para abrir configuración
  context.subscriptions.push(
    vscode.commands.registerCommand('anime-error-translator.openSettings', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'anime-error-translator');
    })
  );


  // Comando para inspeccionar mensajes desconocidos recogidos durante la sesión
  context.subscriptions.push(
    vscode.commands.registerCommand('anime-error-translator.showUnknowns', async () => {
      const items = Array.from(UNKNOWN_COUNTERS.entries()).sort((a,b) => b[1] - a[1]);
      if (items.length === 0) {
        vscode.window.showInformationMessage('No se han registrado errores desconocidos.');
        return;
      }
      const pickItems = items.map(([msg, count]) => `${count}x — ${msg}`);
      const pick = await vscode.window.showQuickPick(pickItems, { placeHolder: 'Errores desconocidos (selecciona para copiar al portapapeles)' });
      if (!pick) { return; }
      // strip the prefix e.g. '3x — '
      const selected = pick.replace(/^\d+x — /, '');
      await vscode.env.clipboard.writeText(selected);
      vscode.window.showInformationMessage('Mensaje desconocido copiado al portapapeles');
    })
  );

  // (Export command removed per user request — unknowns are kept in-memory and can be reviewed with "Mostrar errores desconocidos" only)

  // Leer errores existentes al activar
  processDiagnostics(viewProvider, context.extensionUri);

  // Runtime custom mappings loading removed per owner request — mappings are managed in source by the project owner.

  // Escuchar cambios de errores
  vscode.languages.onDidChangeDiagnostics(() => {
    processDiagnostics(viewProvider, context.extensionUri);
  });
}

export function deactivate() {}

/*************************************/
/* Helpers                            */
/*************************************/
function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for(let i=0;i<32;i++){ text+=possible.charAt(Math.floor(Math.random()*possible.length)); }
  return text;
}

function escapeHtml(unsafe: string) {
  return unsafe.replace(/[&<"'>]/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'} as Record<string,string>)[m] || '');
}
