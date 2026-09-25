// Tagged template for Markdown outlines in tests.
// It removes the first and last empty lines and the indentation shared by all
// lines. An outline can then be written at the same depth as the code around it.
export function md(
	strings: TemplateStringsArray,
	...values: unknown[]
): string {
	const raw = strings.reduce(
		(text, part, i) =>
			text + part + (i < values.length ? String(values[i]) : ''),
		'',
	);
	const lines = raw.split('\n');
	if (lines.length > 0 && lines[0].trim() === '') {
		lines.shift();
	}
	if (lines.length > 0 && lines[lines.length - 1].trim() === '') {
		lines.pop();
	}
	const indent = commonIndent(lines.filter(line => line.trim() !== ''));
	return lines
		.map(line => (line.trim() === '' ? '' : line.slice(indent.length)))
		.join('\n');
}

// The leading whitespace that every given line starts with
function commonIndent(lines: string[]): string {
	if (lines.length === 0) {
		return '';
	}
	let indent = /^[\t ]*/.exec(lines[0])![0];
	for (const line of lines) {
		while (!line.startsWith(indent)) {
			indent = indent.slice(0, -1);
		}
	}
	return indent;
}
