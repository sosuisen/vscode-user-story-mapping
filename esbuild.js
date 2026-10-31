const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// The generated wasm-bindgen glue reads the .wasm file next to the bundled script, so the file is copied into dist
const wasmFile = 'story_map_wasm_bg.wasm';
const wasmSource = path.join('crates', 'story-map-wasm', 'pkg', wasmFile);

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

async function main() {
	const extensionCtx = await esbuild.context({
		entryPoints: ['src/extension.ts'],
		bundle: true,
		format: 'cjs',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'warning',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
	const webviewCtx = await esbuild.context({
		entryPoints: ['src/webview/main.ts'],
		bundle: true,
		format: 'iife',
		minify: production,
		sourcemap: !production,
		sourcesContent: false,
		platform: 'browser',
		outfile: 'dist/webview.js',
		logLevel: 'warning',
		plugins: [esbuildProblemMatcherPlugin],
	});
	fs.mkdirSync('dist', { recursive: true });
	fs.copyFileSync(wasmSource, path.join('dist', wasmFile));
	if (watch) {
		await Promise.all([extensionCtx.watch(), webviewCtx.watch()]);
	} else {
		await Promise.all([extensionCtx.rebuild(), webviewCtx.rebuild()]);
		await Promise.all([extensionCtx.dispose(), webviewCtx.dispose()]);
	}
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd(result => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				if (location == null) {
					return;
				}
				console.error(
					`    ${location.file}:${location.line}:${location.column}:`,
				);
			});
			console.log('[watch] build finished');
		});
	},
};

main().catch(e => {
	console.error(e);
	process.exit(1);
});
