import * as assert from 'assert';
import { translateErrorWithMeta } from '../extension';

suite('Mappings Tests (built-in)', () => {
	test('built-in ERROR_LIST matches common messages', () => {
		const res = translateErrorWithMeta("Cannot read properties of undefined (reading 'foo')");
		assert.strictEqual(res.key, 'cannot_read_property');

		const res2 = translateErrorWithMeta("TypeError: Cannot set properties of null (setting 'foo')");
		assert.strictEqual(res2.key, 'type_error');

		const res3 = translateErrorWithMeta("foo is not a function");
		assert.strictEqual(res3.key, 'not_a_function');
	});
});