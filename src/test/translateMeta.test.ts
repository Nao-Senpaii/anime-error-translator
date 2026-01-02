import * as assert from 'assert';
import { translateErrorWithMeta } from '../extension';

suite('Translate Error Meta Tests', () => {
	test('is not a function -> key', () => {
		const res = translateErrorWithMeta('foo is not a function');
		assert.strictEqual(res.key, 'not_a_function');
	});

	test('cannot read property -> key', () => {
		const res = translateErrorWithMeta("Cannot read property 'foo' of undefined");
		assert.strictEqual(res.key, 'cannot_read_property');
	});

	test('not defined -> key', () => {
		const res = translateErrorWithMeta('bar is not defined');
		assert.strictEqual(res.key, 'not_defined');
	});

	test('syntax error -> key', () => {
		const res = translateErrorWithMeta('Unexpected token < in JSON');
		assert.strictEqual(res.key, 'syntax_error');
	});

	test('module not found -> key', () => {
		const res = translateErrorWithMeta("Error: Cannot find module 'foo'");
		assert.strictEqual(res.key, 'module_not_found');
	});

	test('unknown -> key', () => {
		const res = translateErrorWithMeta('Some random thing');
		assert.strictEqual(res.key, 'unknown');
	});

	test('cannot read properties -> key', () => {
		const res = translateErrorWithMeta("Cannot read properties of undefined (reading 'foo')");
		assert.strictEqual(res.key, 'cannot_read_property');
	});

	test('typescript types -> key', () => {
		const res = translateErrorWithMeta('Type annotations can only be used in TypeScript files.');
		assert.strictEqual(res.key, 'typescript_types');
	});

	test('typescript code via diagnostic -> key', () => {
		const res = translateErrorWithMeta('Some compilation failure message', { code: 'TS2304' });
		assert.strictEqual(res.key, 'typescript_types');
	});

	test('enoent -> key', () => {
		const res = translateErrorWithMeta("ENOENT: no such file or directory, stat '/nonexistent' ");
		assert.strictEqual(res.key, 'file_not_found');
	});

	test('TypeError prefix -> not_a_function', () => {
		const res = translateErrorWithMeta('TypeError: foo is not a function');
		assert.strictEqual(res.key, 'not_a_function');
	});

	test('ReferenceError prefix -> not_defined', () => {
		const res = translateErrorWithMeta('ReferenceError: bar is not defined');
		assert.strictEqual(res.key, 'not_defined');
	});
});
